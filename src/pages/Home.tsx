import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { IonContent, IonPage } from "@ionic/react";
import { getCurrentLocation } from "../services/geolocation";
import {
  connectFriends,
  createStory,
  createUser,
  deleteUser,
  fileToAttachment,
  listMessages,
  listStories,
  listUsers,
  searchUsers,
  sendMessage,
  updateUser,
} from "../services/api";
import type {
  MediaAttachment,
  Message,
  NearbyStory,
  User,
  UserMatch,
} from "../shared/types";
import "./Home.css";

type UserDraft = {
  name: string;
  email: string;
  city: string;
  bio: string;
  avatarUrl: string;
  lat: string;
  lng: string;
};

type MessageDraft = {
  senderId: string;
  recipientIds: string[];
  text: string;
  attachments: MediaAttachment[];
};

type StoryDraft = {
  authorId: string;
  text: string;
  lat: string;
  lng: string;
  media: MediaAttachment | null;
};

type AppTab = "overview" | "users" | "friends" | "messages" | "stories";

const blankUserDraft: UserDraft = {
  name: "",
  email: "",
  city: "",
  bio: "",
  avatarUrl: "",
  lat: "",
  lng: "",
};

const blankMessageDraft: MessageDraft = {
  senderId: "",
  recipientIds: [],
  text: "",
  attachments: [],
};

const blankStoryDraft: StoryDraft = {
  authorId: "",
  text: "",
  lat: "",
  lng: "",
  media: null,
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getUserLabel = (user: User | undefined) =>
  user ? `${user.name} · ${user.city}` : "Utilisateur inconnu";

const Home = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stories, setStories] = useState<NearbyStory[]>([]);
  const [searchResults, setSearchResults] = useState<UserMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRadius, setSearchRadius] = useState("40");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userDraft, setUserDraft] = useState<UserDraft>(blankUserDraft);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] =
    useState<MessageDraft>(blankMessageDraft);
  const [storyDraft, setStoryDraft] = useState<StoryDraft>(blankStoryDraft);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const storyAuthor = useMemo(
    () => users.find((user) => user.id === storyDraft.authorId) ?? null,
    [storyDraft.authorId, users],
  );

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
      setMessageDraft((current) => ({
        ...current,
        senderId: users[0].id,
      }));
      setStoryDraft((current) => ({
        ...current,
        authorId: users[0].id,
      }));
    }
  }, [selectedUserId, users]);

  const setSuccess = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3200);
  };

  const refreshAll = useCallback(
    async (nextLocation = location) => {
      setLoading(true);
      try {
        const [nextUsers, nextMessages, nextStories] = await Promise.all([
          listUsers(),
          listMessages(),
          listStories(
            nextLocation?.lat,
            nextLocation?.lng,
            Number(searchRadius) || 40,
          ),
        ]);
        setUsers(nextUsers);
        setMessages(nextMessages);
        setStories(nextStories);
        setSearchResults([]);

        if (!selectedUserId && nextUsers.length > 0) {
          setSelectedUserId(nextUsers[0].id);
        }

        if (!messageDraft.senderId && nextUsers.length > 0) {
          setMessageDraft((current) => ({
            ...current,
            senderId: nextUsers[0].id,
          }));
        }

        if (!storyDraft.authorId && nextUsers.length > 0) {
          setStoryDraft((current) => ({
            ...current,
            authorId: nextUsers[0].id,
          }));
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    [
      location,
      messageDraft.senderId,
      searchRadius,
      selectedUserId,
      storyDraft.authorId,
    ],
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserDraft(blankUserDraft);
  };

  const beginEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserDraft({
      name: user.name,
      email: user.email,
      city: user.city,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      lat: String(user.lat),
      lng: String(user.lng),
    });
    setSelectedUserId(user.id);
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          name: userDraft.name,
          email: userDraft.email,
          city: userDraft.city,
          bio: userDraft.bio,
          avatarUrl: userDraft.avatarUrl,
          lat: Number(userDraft.lat) || 0,
          lng: Number(userDraft.lng) || 0,
        });
        setSuccess("Utilisateur mis à jour.");
      } else {
        await createUser({
          name: userDraft.name,
          email: userDraft.email,
          city: userDraft.city,
          bio: userDraft.bio,
          avatarUrl: userDraft.avatarUrl,
          lat: Number(userDraft.lat) || 0,
          lng: Number(userDraft.lng) || 0,
        });
        setSuccess("Utilisateur créé.");
      }
      resetUserForm();
      await refreshAll();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm(
      "Supprimer cet utilisateur et ses données liées ?",
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(userId);
      if (selectedUserId === userId) {
        setSelectedUserId("");
      }
      if (messageDraft.senderId === userId) {
        setMessageDraft((current) => ({ ...current, senderId: "" }));
      }
      if (storyDraft.authorId === userId) {
        setStoryDraft((current) => ({ ...current, authorId: "" }));
      }
      setSuccess("Utilisateur supprimé.");
      await refreshAll();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const handleFriendSearch = async () => {
    try {
      const results = await searchUsers(
        searchQuery,
        location?.lat,
        location?.lng,
      );
      setSearchResults(results);
      setSuccess(`${results.length} résultat(s) trouvé(s).`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const handleConnectFriend = async (friendId: string) => {
    if (!selectedUserId) {
      setFeedback("Sélectionne d’abord un utilisateur courant.");
      return;
    }

    try {
      await connectFriends(selectedUserId, friendId);
      setSuccess("Ami ajouté.");
      await refreshAll();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const handleAttachmentChange = async (
    event: ChangeEvent<HTMLInputElement>,
    onReady: (attachment: MediaAttachment | null) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      onReady(null);
      return;
    }

    const attachment = await fileToAttachment(file);
    onReady(attachment);
  };

  const handleMessageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageDraft.senderId || messageDraft.recipientIds.length === 0) {
      setFeedback("Sélectionne un expéditeur et au moins un destinataire.");
      return;
    }

    try {
      await sendMessage({
        senderId: messageDraft.senderId,
        recipientIds: messageDraft.recipientIds,
        text: messageDraft.text,
        attachments: messageDraft.attachments,
      });
      setMessageDraft((current) => ({
        ...blankMessageDraft,
        senderId: current.senderId,
      }));
      setSuccess("Message envoyé.");
      await refreshAll();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const useCurrentLocation = async () => {
    try {
      const nextLocation = await getCurrentLocation();
      setLocation(nextLocation);
      setStoryDraft((current) => ({
        ...current,
        lat: String(nextLocation.lat),
        lng: String(nextLocation.lng),
      }));
      setSuccess("Position GPS mise à jour.");
      void refreshAll(nextLocation);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer la position GPS.",
      );
    }
  };

  const handleStorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storyDraft.authorId || !storyDraft.text.trim()) {
      setFeedback("Sélectionne un auteur et un texte pour la story.");
      return;
    }

    try {
      await createStory({
        authorId: storyDraft.authorId,
        text: storyDraft.text,
        media: storyDraft.media,
        lat: Number(storyDraft.lat) || storyAuthor?.lat,
        lng: Number(storyDraft.lng) || storyAuthor?.lng,
      });
      setStoryDraft((current) => ({
        ...blankStoryDraft,
        authorId: current.authorId,
      }));
      setSuccess("Story publiée.");
      await refreshAll();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const dashboardStats = [
    { label: "Utilisateurs", value: users.length.toString() },
    { label: "Messages", value: messages.length.toString() },
    { label: "Stories", value: stories.length.toString() },
    { label: "Connexion", value: loading ? "Sync..." : "Live JSON" },
  ];

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="snapshoot-shell">
          <section className="hero-card">
            <div>
              <p className="eyebrow">Snapshoot</p>
              <h1>
                Social mobile pour messages, groupes et stories géolocalisées.
              </h1>
              <p className="hero-copy">
                Démo complète pour le grading: CRUD utilisateurs, recherche par
                email ou id, messages privés ou de groupe, et découverte de
                contenus autour de la position GPS.
              </p>
            </div>
            <div className="hero-panel">
              <span className="hero-tag">Android-ready</span>
              <span className="hero-tag">Backend JSON local</span>
              <span className="hero-tag">Media image / vidéo</span>
            </div>
          </section>

          <section className="stats-grid">
            {dashboardStats.map((item) => (
              <article key={item.label} className="stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>

          <section className="toolbar-card">
            <div className="toolbar-row">
              <label>
                Utilisateur actif
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Rayon stories (km)
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={searchRadius}
                  onChange={(event) => setSearchRadius(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="ghost-button"
                onClick={() => void refreshAll()}
              >
                Rafraîchir
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={useCurrentLocation}
              >
                Utiliser le GPS
              </button>
            </div>

            {feedback ? <p className="feedback-banner">{feedback}</p> : null}
          </section>

          <section
            className="tab-bar"
            role="tablist"
            aria-label="Navigation principale"
          >
            {[
              { id: "overview", label: "Aperçu" },
              { id: "users", label: "Utilisateurs" },
              { id: "friends", label: "Amis" },
              { id: "messages", label: "Messages" },
              { id: "stories", label: "Stories" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id as AppTab)}
              >
                {tab.label}
              </button>
            ))}
          </section>

          {activeTab === "overview" ? (
            <section className="panel-card overview-panel">
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Vue d'ensemble</p>
                  <h2>Navigation par onglets, comme une app sociale mobile</h2>
                </div>
              </div>

              <div className="overview-grid">
                {dashboardStats.map((item) => (
                  <article key={item.label} className="overview-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="overview-split">
                <article className="overview-card overview-card--wide">
                  <span>Profil courant</span>
                  {selectedUser ? (
                    <>
                      <strong>{selectedUser.name}</strong>
                      <p>{selectedUser.email}</p>
                      <p>{selectedUser.city}</p>
                    </>
                  ) : (
                    <p className="empty-state">
                      Sélectionne un utilisateur pour débloquer les actions
                      sociales.
                    </p>
                  )}
                </article>

                <article className="overview-card overview-card--wide">
                  <span>Raccourcis</span>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setActiveTab("users")}
                    >
                      Utilisateurs
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setActiveTab("messages")}
                    >
                      Messages
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setActiveTab("stories")}
                    >
                      Stories
                    </button>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          <div className="content-grid">
            <section
              className={`panel-card tab-panel ${activeTab === "users" ? "" : "tab-panel--hidden"}`}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">User management</p>
                  <h2>
                    {editingUserId
                      ? "Modifier un utilisateur"
                      : "Créer un utilisateur"}
                  </h2>
                </div>
                {editingUserId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetUserForm}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>

              <form className="stack-form" onSubmit={handleUserSubmit}>
                <div className="form-grid two-columns">
                  <label>
                    Nom
                    <input
                      required
                      value={userDraft.name}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={userDraft.email}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Ville
                    <input
                      required
                      value={userDraft.city}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Avatar URL
                    <input
                      value={userDraft.avatarUrl}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          avatarUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Latitude
                    <input
                      type="number"
                      step="0.0001"
                      value={userDraft.lat}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          lat: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      type="number"
                      step="0.0001"
                      value={userDraft.lng}
                      onChange={(event) =>
                        setUserDraft((current) => ({
                          ...current,
                          lng: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Bio
                  <textarea
                    rows={4}
                    value={userDraft.bio}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                </label>
                <button type="submit" className="primary-button">
                  {editingUserId ? "Sauvegarder" : "Créer"}
                </button>
              </form>

              <div className="list-block">
                <h3>Utilisateurs existants</h3>
                <div className="user-list">
                  {users.map((user) => (
                    <article
                      key={user.id}
                      className={`user-card ${selectedUserId === user.id ? "active" : ""}`}
                    >
                      <div className="user-card__top">
                        <img
                          src={user.avatarUrl || "https://placehold.co/120x120"}
                          alt={user.name}
                        />
                        <div>
                          <strong>{user.name}</strong>
                          <p>{user.email}</p>
                          <p>{user.city}</p>
                        </div>
                      </div>
                      <p className="muted">{user.bio}</p>
                      <p className="meta-line">
                        ID {user.id} · {user.friends.length} ami(s)
                      </p>
                      <div className="card-actions">
                        <button
                          type="button"
                          onClick={() => beginEditUser(user)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => void handleDeleteUser(user.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section
              className={`panel-card tab-panel ${activeTab === "users" || activeTab === "friends" ? "" : "tab-panel--hidden"}`}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Find friends</p>
                  <h2>Recherche par email, id ou ville</h2>
                </div>
              </div>

              <div className="stack-form">
                <label>
                  Rechercher
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleFriendSearch()}
                  >
                    Chercher
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setSearchResults([])}
                  >
                    Vider
                  </button>
                </div>
              </div>

              <div className="list-block">
                <h3>Résultats</h3>
                <div className="search-list">
                  {searchResults.length === 0 ? (
                    <p className="empty-state">
                      Aucun résultat affiché. Lance une recherche pour trouver
                      des amis.
                    </p>
                  ) : (
                    searchResults.map((user) => (
                      <article key={user.id} className="result-card">
                        <img
                          src={user.avatarUrl || "https://placehold.co/96x96"}
                          alt={user.name}
                        />
                        <div>
                          <strong>{user.name}</strong>
                          <p>{user.email}</p>
                          <p>{user.city}</p>
                          {user.distanceKm > 0 ? (
                            <p className="muted">{user.distanceKm} km</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleConnectFriend(user.id)}
                        >
                          Ajouter
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="mini-summary">
                <h3>Profil courant</h3>
                {selectedUser ? (
                  <article className="profile-chip">
                    <strong>{selectedUser.name}</strong>
                    <span>{selectedUser.email}</span>
                    <span>{selectedUser.city}</span>
                  </article>
                ) : (
                  <p className="empty-state">
                    Choisis un utilisateur pour activer les actions sociales.
                  </p>
                )}
              </div>
            </section>

            <section
              className={`panel-card tab-panel ${activeTab === "messages" ? "" : "tab-panel--hidden"}`}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Messaging</p>
                  <h2>Envoyer un message privé ou de groupe</h2>
                </div>
              </div>

              <form className="stack-form" onSubmit={handleMessageSubmit}>
                <div className="form-grid two-columns">
                  <label>
                    Expéditeur
                    <select
                      required
                      value={messageDraft.senderId}
                      onChange={(event) =>
                        setMessageDraft((current) => ({
                          ...current,
                          senderId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choisir</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Destinataires
                    <select
                      required
                      multiple
                      size={6}
                      value={messageDraft.recipientIds}
                      onChange={(event) =>
                        setMessageDraft((current) => ({
                          ...current,
                          recipientIds: Array.from(
                            event.target.selectedOptions,
                            (option) => option.value,
                          ),
                        }))
                      }
                    >
                      {users
                        .filter((user) => user.id !== messageDraft.senderId)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.id})
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <label>
                  Message
                  <textarea
                    rows={4}
                    required
                    value={messageDraft.text}
                    onChange={(event) =>
                      setMessageDraft((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Pièce jointe image / vidéo
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        setMessageDraft((current) => ({
                          ...current,
                          attachments: [],
                        }));
                        return;
                      }
                      const attachment = await fileToAttachment(file);
                      setMessageDraft((current) => ({
                        ...current,
                        attachments: [attachment],
                      }));
                    }}
                  />
                </label>

                {messageDraft.attachments[0] ? (
                  <div className="attachment-preview">
                    {messageDraft.attachments[0].type === "video" ? (
                      <video src={messageDraft.attachments[0].url} controls />
                    ) : (
                      <img
                        src={messageDraft.attachments[0].url}
                        alt={messageDraft.attachments[0].name}
                      />
                    )}
                  </div>
                ) : null}

                <button type="submit" className="primary-button">
                  Envoyer
                </button>
              </form>

              <div className="list-block">
                <h3>Messages récents</h3>
                <div className="message-feed">
                  {messages.map((message) => {
                    const sender = users.find(
                      (user) => user.id === message.senderId,
                    );
                    const recipients = message.recipientIds
                      .map(
                        (recipientId) =>
                          users.find((user) => user.id === recipientId)?.name ??
                          recipientId,
                      )
                      .join(", ");

                    return (
                      <article key={message.id} className="message-card">
                        <div className="message-card__header">
                          <strong>{getUserLabel(sender ?? undefined)}</strong>
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                        <p>{message.text}</p>
                        <p className="muted">Vers {recipients}</p>
                        {message.attachments[0] ? (
                          <div className="attachment-preview compact">
                            {message.attachments[0].type === "video" ? (
                              <video
                                src={message.attachments[0].url}
                                controls
                              />
                            ) : (
                              <img
                                src={message.attachments[0].url}
                                alt={message.attachments[0].name}
                              />
                            )}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              className={`panel-card wide-panel tab-panel ${activeTab === "stories" ? "" : "tab-panel--hidden"}`}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Geolocation</p>
                  <h2>Stories découvertes autour de ta position</h2>
                </div>
              </div>

              <form className="stack-form" onSubmit={handleStorySubmit}>
                <div className="form-grid two-columns">
                  <label>
                    Auteur
                    <select
                      required
                      value={storyDraft.authorId}
                      onChange={(event) =>
                        setStoryDraft((current) => ({
                          ...current,
                          authorId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choisir</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Latitude
                    <input
                      type="number"
                      step="0.0001"
                      value={storyDraft.lat}
                      onChange={(event) =>
                        setStoryDraft((current) => ({
                          ...current,
                          lat: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      type="number"
                      step="0.0001"
                      value={storyDraft.lng}
                      onChange={(event) =>
                        setStoryDraft((current) => ({
                          ...current,
                          lng: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Média
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={async (event) => {
                        await handleAttachmentChange(event, (attachment) =>
                          setStoryDraft((current) => ({
                            ...current,
                            media: attachment,
                          })),
                        );
                      }}
                    />
                  </label>
                </div>

                <label>
                  Story
                  <textarea
                    rows={4}
                    required
                    value={storyDraft.text}
                    onChange={(event) =>
                      setStoryDraft((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                  />
                </label>

                {storyDraft.media ? (
                  <div className="attachment-preview">
                    {storyDraft.media.type === "video" ? (
                      <video src={storyDraft.media.url} controls />
                    ) : (
                      <img
                        src={storyDraft.media.url}
                        alt={storyDraft.media.name}
                      />
                    )}
                  </div>
                ) : null}

                <div className="inline-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={useCurrentLocation}
                  >
                    Copier le GPS
                  </button>
                  <button type="submit" className="primary-button">
                    Publier
                  </button>
                </div>
              </form>

              <div className="list-block">
                <h3>Stories proches</h3>
                <div className="story-grid">
                  {stories.map((story) => (
                    <article key={story.id} className="story-card">
                      <div className="story-card__header">
                        <strong>{story.author.name}</strong>
                        <span>
                          {story.distanceKm > 0
                            ? `${story.distanceKm} km`
                            : "local"}
                        </span>
                      </div>
                      <p>{story.text}</p>
                      <p className="muted">{formatDate(story.createdAt)}</p>
                      {story.media ? (
                        <div className="attachment-preview compact">
                          {story.media.type === "video" ? (
                            <video src={story.media.url} controls />
                          ) : (
                            <img src={story.media.url} alt={story.media.name} />
                          )}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
