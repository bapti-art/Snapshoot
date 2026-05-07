import cors from 'cors';
import express from 'express';
import type { AppDb, Message, NearbyStory, Story, User, UserMatch } from '../src/shared/types';
import { clampNumber, createId, readDb, writeDb } from './storage';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const distanceKm = (latA: number, lngA: number, latB: number, lngB: number): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const deltaLat = toRad(latB - latA);
  const deltaLng = toRad(lngB - lngA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getUsers = async (): Promise<User[]> => (await readDb()).users;
const getDb = async (): Promise<AppDb> => readDb();

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'snapshoot-backend' });
});

app.get('/api/users', async (_request, response) => {
  const db = await getDb();
  response.json(db.users);
});

app.get('/api/users/search', async (request, response) => {
  const query = String(request.query.query ?? '').trim().toLowerCase();
  const users = await getUsers();

  const matches = users.filter((user) => {
    if (!query) {
      return true;
    }

    return [user.id, user.name, user.email, user.city].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  const originLat = clampNumber(request.query.lat, NaN);
  const originLng = clampNumber(request.query.lng, NaN);

  const payload: UserMatch[] = matches.map((user) => ({
    ...user,
    distanceKm:
      Number.isFinite(originLat) && Number.isFinite(originLng)
        ? Number(distanceKm(originLat, originLng, user.lat, user.lng).toFixed(1))
        : 0,
  }));

  response.json(payload);
});

app.post('/api/users', async (request, response) => {
  const { name, email, city, bio = '', avatarUrl = '', lat = 0, lng = 0 } = request.body ?? {};

  if (!name || !email || !city) {
    response.status(400).json({ message: 'name, email et city sont requis.' });
    return;
  }

  const db = await getDb();
  const duplicate = db.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());

  if (duplicate) {
    response.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    return;
  }

  const user: User = {
    id: createId('user'),
    name: String(name).trim(),
    email: String(email).trim(),
    city: String(city).trim(),
    bio: String(bio).trim(),
    avatarUrl: String(avatarUrl).trim(),
    lat: clampNumber(lat),
    lng: clampNumber(lng),
    friends: [],
    createdAt: new Date().toISOString(),
  };

  db.users.unshift(user);
  await writeDb(db);
  response.status(201).json(user);
});

app.put('/api/users/:id', async (request, response) => {
  const db = await getDb();
  const index = db.users.findIndex((user) => user.id === request.params.id);

  if (index < 0) {
    response.status(404).json({ message: 'Utilisateur introuvable.' });
    return;
  }

  const current = db.users[index];
  const nextUser: User = {
    ...current,
    ...request.body,
    id: current.id,
    friends: Array.isArray(request.body?.friends) ? request.body.friends : current.friends,
  };

  db.users[index] = nextUser;
  await writeDb(db);
  response.json(nextUser);
});

app.delete('/api/users/:id', async (request, response) => {
  const db = await getDb();
  const beforeCount = db.users.length;
  db.users = db.users.filter((user) => user.id !== request.params.id);
  db.users = db.users.map((user) => ({
    ...user,
    friends: user.friends.filter((friendId) => friendId !== request.params.id),
  }));
  db.messages = db.messages.filter(
    (message) =>
      message.senderId !== request.params.id && !message.recipientIds.includes(request.params.id),
  );
  db.stories = db.stories.filter((story) => story.authorId !== request.params.id);

  if (db.users.length === beforeCount) {
    response.status(404).json({ message: 'Utilisateur introuvable.' });
    return;
  }

  await writeDb(db);
  response.status(204).send();
});

app.post('/api/users/:id/friends', async (request, response) => {
  const friendId = String(request.body?.friendId ?? '').trim();

  if (!friendId) {
    response.status(400).json({ message: 'friendId est requis.' });
    return;
  }

  const db = await getDb();
  const user = db.users.find((item) => item.id === request.params.id);
  const friend = db.users.find((item) => item.id === friendId);

  if (!user || !friend) {
    response.status(404).json({ message: 'Utilisateur introuvable.' });
    return;
  }

  if (!user.friends.includes(friendId)) {
    user.friends.push(friendId);
  }

  if (!friend.friends.includes(user.id)) {
    friend.friends.push(user.id);
  }

  await writeDb(db);
  response.json({ user, friend });
});

app.get('/api/messages', async (_request, response) => {
  const db = await getDb();
  response.json(db.messages);
});

app.post('/api/messages', async (request, response) => {
  const { senderId, recipientIds, text = '', attachments = [] } = request.body ?? {};
  const recipientList = Array.isArray(recipientIds) ? recipientIds.filter(Boolean) : [];

  if (!senderId || recipientList.length === 0 || !text.trim()) {
    response.status(400).json({ message: 'senderId, recipientIds et text sont requis.' });
    return;
  }

  const db = await getDb();
  const sender = db.users.find((user) => user.id === senderId);
  const recipients = db.users.filter((user) => recipientList.includes(user.id));

  if (!sender || recipients.length === 0) {
    response.status(404).json({ message: 'Expéditeur ou destinataire introuvable.' });
    return;
  }

  const message: Message = {
    id: createId('msg'),
    senderId,
    recipientIds: recipients.map((recipient) => recipient.id),
    text: String(text).trim(),
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: new Date().toISOString(),
  };

  db.messages.unshift(message);
  await writeDb(db);
  response.status(201).json(message);
});

app.get('/api/stories', async (request, response) => {
  const db = await getDb();
  const lat = clampNumber(request.query.lat, NaN);
  const lng = clampNumber(request.query.lng, NaN);
  const radiusKm = clampNumber(request.query.radiusKm, 40);

  const nearbyStories: NearbyStory[] = db.stories
    .map((story) => {
      const author = db.users.find((user) => user.id === story.authorId);
      if (!author) {
        return null;
      }

      return {
        ...story,
        author,
        distanceKm:
          Number.isFinite(lat) && Number.isFinite(lng)
            ? Number(distanceKm(lat, lng, story.lat, story.lng).toFixed(1))
            : 0,
      };
    })
    .filter((story): story is NearbyStory => story !== null)
    .filter((story) => (Number.isFinite(lat) && Number.isFinite(lng) ? story.distanceKm <= radiusKm : true))
    .sort((left, right) => left.distanceKm - right.distanceKm);

  response.json(nearbyStories);
});

app.post('/api/stories', async (request, response) => {
  const { authorId, text = '', media = null, lat, lng } = request.body ?? {};

  if (!authorId || !String(text).trim()) {
    response.status(400).json({ message: 'authorId et text sont requis.' });
    return;
  }

  const db = await getDb();
  const author = db.users.find((user) => user.id === authorId);

  if (!author) {
    response.status(404).json({ message: 'Auteur introuvable.' });
    return;
  }

  const story: Story = {
    id: createId('story'),
    authorId,
    text: String(text).trim(),
    media,
    lat: clampNumber(lat, author.lat),
    lng: clampNumber(lng, author.lng),
    createdAt: new Date().toISOString(),
  };

  db.stories.unshift(story);
  await writeDb(db);
  response.status(201).json(story);
});

app.listen(port, () => {
  console.log(`Snapshoot backend running on http://localhost:${port}`);
});
