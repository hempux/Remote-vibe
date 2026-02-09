using Microsoft.Data.Sqlite;
using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public class SqliteSessionManager : ISessionManager, IDisposable
{
    private readonly ILogger<SqliteSessionManager> _logger;
    private readonly SqliteConnection _connection;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public SqliteSessionManager(ILogger<SqliteSessionManager> logger, IConfiguration configuration)
    {
        _logger = logger;

        var dbPath = configuration["Database:Path"] ?? "data/remotevibe.db";
        var dir = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        _connection = new SqliteConnection($"Data Source={dbPath}");
        _connection.Open();

        InitializeDatabase();
        _logger.LogInformation("SQLite database initialized at {DbPath}", dbPath);
    }

    private void InitializeDatabase()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Sessions (
                Id TEXT PRIMARY KEY,
                RepositoryOwner TEXT NOT NULL DEFAULT '',
                RepositoryName TEXT NOT NULL DEFAULT '',
                RepositoryPath TEXT NOT NULL DEFAULT '',
                TaskDescription TEXT,
                Status INTEGER NOT NULL DEFAULT 0,
                StartedAt TEXT NOT NULL,
                LastActivityAt TEXT,
                CurrentCommand TEXT
            );

            CREATE TABLE IF NOT EXISTS Messages (
                Id TEXT PRIMARY KEY,
                SessionId TEXT NOT NULL,
                Type INTEGER NOT NULL,
                Content TEXT NOT NULL DEFAULT '',
                Timestamp TEXT NOT NULL,
                Metadata TEXT,
                FOREIGN KEY (SessionId) REFERENCES Sessions(Id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS PendingQuestions (
                Id TEXT PRIMARY KEY,
                SessionId TEXT NOT NULL,
                Question TEXT NOT NULL DEFAULT '',
                AskedAt TEXT NOT NULL,
                Type INTEGER NOT NULL,
                Options TEXT,
                SortOrder INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (SessionId) REFERENCES Sessions(Id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS IX_Messages_SessionId ON Messages(SessionId);
            CREATE INDEX IF NOT EXISTS IX_PendingQuestions_SessionId ON PendingQuestions(SessionId);

            PRAGMA journal_mode=WAL;
            PRAGMA foreign_keys=ON;
        ";
        cmd.ExecuteNonQuery();
    }

    public async Task<Session> StartSessionAsync(string repositoryOwner, string repositoryName, string? taskDescription = null, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var session = new Session
            {
                RepositoryOwner = repositoryOwner,
                RepositoryName = repositoryName,
                RepositoryPath = $"{repositoryOwner}/{repositoryName}",
                TaskDescription = taskDescription,
                Status = SessionStatus.Idle,
                StartedAt = DateTime.UtcNow
            };

            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO Sessions (Id, RepositoryOwner, RepositoryName, RepositoryPath, TaskDescription, Status, StartedAt)
                VALUES ($id, $owner, $name, $path, $desc, $status, $startedAt)";
            cmd.Parameters.AddWithValue("$id", session.Id);
            cmd.Parameters.AddWithValue("$owner", session.RepositoryOwner);
            cmd.Parameters.AddWithValue("$name", session.RepositoryName);
            cmd.Parameters.AddWithValue("$path", session.RepositoryPath);
            cmd.Parameters.AddWithValue("$desc", (object?)session.TaskDescription ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$status", (int)session.Status);
            cmd.Parameters.AddWithValue("$startedAt", session.StartedAt.ToString("O"));
            cmd.ExecuteNonQuery();

            _logger.LogInformation("Started session {SessionId} for repository {RepositoryOwner}/{RepositoryName}",
                session.Id, repositoryOwner, repositoryName);

            return session;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Session?> GetCurrentSessionAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                SELECT * FROM Sessions
                WHERE Status NOT IN ($completed, $error)
                ORDER BY StartedAt DESC
                LIMIT 1";
            cmd.Parameters.AddWithValue("$completed", (int)SessionStatus.Completed);
            cmd.Parameters.AddWithValue("$error", (int)SessionStatus.Error);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return ReadSessionWithRelations(reader);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<IEnumerable<Session>> GetAllSessionsAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var sessions = new List<Session>();
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT * FROM Sessions ORDER BY StartedAt DESC";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                sessions.Add(ReadSessionWithRelations(reader));
            }
            return sessions;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Session?> GetSessionAsync(string sessionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT * FROM Sessions WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", sessionId);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return ReadSessionWithRelations(reader);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task UpdateSessionStatusAsync(string sessionId, SessionStatus status, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                UPDATE Sessions SET Status = $status, LastActivityAt = $now
                WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", sessionId);
            cmd.Parameters.AddWithValue("$status", (int)status);
            cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
            cmd.ExecuteNonQuery();

            _logger.LogInformation("Session {SessionId} status updated to {Status}", sessionId, status);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task AddMessageAsync(string sessionId, ConversationMessage message, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO Messages (Id, SessionId, Type, Content, Timestamp, Metadata)
                VALUES ($id, $sessionId, $type, $content, $timestamp, $metadata);
                UPDATE Sessions SET LastActivityAt = $now WHERE Id = $sessionId";
            cmd.Parameters.AddWithValue("$id", message.Id);
            cmd.Parameters.AddWithValue("$sessionId", sessionId);
            cmd.Parameters.AddWithValue("$type", (int)message.Type);
            cmd.Parameters.AddWithValue("$content", message.Content);
            cmd.Parameters.AddWithValue("$timestamp", message.Timestamp.ToString("O"));
            cmd.Parameters.AddWithValue("$metadata", (object?)message.Metadata ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
            cmd.ExecuteNonQuery();

            _logger.LogDebug("Added message to session {SessionId}: {MessageType}", sessionId, message.Type);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<PendingQuestion?> AddPendingQuestionAsync(string sessionId, string question, QuestionType type, List<string>? options = null, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var pendingQuestion = new PendingQuestion
            {
                Question = question,
                Type = type,
                Options = options
            };

            // Get max sort order for this session
            using var countCmd = _connection.CreateCommand();
            countCmd.CommandText = "SELECT COALESCE(MAX(SortOrder), -1) FROM PendingQuestions WHERE SessionId = $sid";
            countCmd.Parameters.AddWithValue("$sid", sessionId);
            var maxOrder = Convert.ToInt32(countCmd.ExecuteScalar());

            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO PendingQuestions (Id, SessionId, Question, AskedAt, Type, Options, SortOrder)
                VALUES ($id, $sessionId, $question, $askedAt, $type, $options, $sortOrder);
                UPDATE Sessions SET Status = $status, LastActivityAt = $now WHERE Id = $sessionId";
            cmd.Parameters.AddWithValue("$id", pendingQuestion.Id);
            cmd.Parameters.AddWithValue("$sessionId", sessionId);
            cmd.Parameters.AddWithValue("$question", pendingQuestion.Question);
            cmd.Parameters.AddWithValue("$askedAt", pendingQuestion.AskedAt.ToString("O"));
            cmd.Parameters.AddWithValue("$type", (int)pendingQuestion.Type);
            cmd.Parameters.AddWithValue("$options", options != null ? System.Text.Json.JsonSerializer.Serialize(options) : DBNull.Value);
            cmd.Parameters.AddWithValue("$sortOrder", maxOrder + 1);
            cmd.Parameters.AddWithValue("$status", (int)SessionStatus.WaitingForInput);
            cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
            cmd.ExecuteNonQuery();

            _logger.LogInformation("Added pending question to session {SessionId}: {Question}", sessionId, question);
            return pendingQuestion;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<PendingQuestion?> GetPendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT * FROM PendingQuestions WHERE Id = $id AND SessionId = $sid";
            cmd.Parameters.AddWithValue("$id", questionId);
            cmd.Parameters.AddWithValue("$sid", sessionId);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return ReadPendingQuestion(reader);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task RemovePendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "DELETE FROM PendingQuestions WHERE Id = $id AND SessionId = $sid";
            cmd.Parameters.AddWithValue("$id", questionId);
            cmd.Parameters.AddWithValue("$sid", sessionId);
            cmd.ExecuteNonQuery();

            // Check if there are remaining pending questions
            using var checkCmd = _connection.CreateCommand();
            checkCmd.CommandText = "SELECT COUNT(*) FROM PendingQuestions WHERE SessionId = $sid";
            checkCmd.Parameters.AddWithValue("$sid", sessionId);
            var remaining = Convert.ToInt32(checkCmd.ExecuteScalar());

            if (remaining == 0)
            {
                using var updateCmd = _connection.CreateCommand();
                updateCmd.CommandText = "UPDATE Sessions SET Status = $status, LastActivityAt = $now WHERE Id = $sid";
                updateCmd.Parameters.AddWithValue("$sid", sessionId);
                updateCmd.Parameters.AddWithValue("$status", (int)SessionStatus.Processing);
                updateCmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
                updateCmd.ExecuteNonQuery();
            }
            else
            {
                using var activityCmd = _connection.CreateCommand();
                activityCmd.CommandText = "UPDATE Sessions SET LastActivityAt = $now WHERE Id = $sid";
                activityCmd.Parameters.AddWithValue("$sid", sessionId);
                activityCmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
                activityCmd.ExecuteNonQuery();
            }

            _logger.LogInformation("Removed pending question {QuestionId} from session {SessionId}", questionId, sessionId);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task StopSessionAsync(string sessionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                DELETE FROM PendingQuestions WHERE SessionId = $id;
                DELETE FROM Messages WHERE SessionId = $id;
                DELETE FROM Sessions WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", sessionId);
            cmd.ExecuteNonQuery();

            _logger.LogInformation("Stopped and removed session {SessionId}", sessionId);
        }
        finally
        {
            _lock.Release();
        }
    }

    private Session ReadSessionWithRelations(SqliteDataReader reader)
    {
        var sessionId = reader.GetString(reader.GetOrdinal("Id"));
        var session = new Session
        {
            Id = sessionId,
            RepositoryOwner = reader.GetString(reader.GetOrdinal("RepositoryOwner")),
            RepositoryName = reader.GetString(reader.GetOrdinal("RepositoryName")),
            RepositoryPath = reader.GetString(reader.GetOrdinal("RepositoryPath")),
            TaskDescription = reader.IsDBNull(reader.GetOrdinal("TaskDescription")) ? null : reader.GetString(reader.GetOrdinal("TaskDescription")),
            Status = (SessionStatus)reader.GetInt32(reader.GetOrdinal("Status")),
            StartedAt = DateTime.Parse(reader.GetString(reader.GetOrdinal("StartedAt"))),
            LastActivityAt = reader.IsDBNull(reader.GetOrdinal("LastActivityAt")) ? null : DateTime.Parse(reader.GetString(reader.GetOrdinal("LastActivityAt"))),
            CurrentCommand = reader.IsDBNull(reader.GetOrdinal("CurrentCommand")) ? null : reader.GetString(reader.GetOrdinal("CurrentCommand")),
        };

        // Load messages
        using var msgCmd = _connection.CreateCommand();
        msgCmd.CommandText = "SELECT * FROM Messages WHERE SessionId = $sid ORDER BY Timestamp ASC";
        msgCmd.Parameters.AddWithValue("$sid", sessionId);

        using var msgReader = msgCmd.ExecuteReader();
        while (msgReader.Read())
        {
            session.History.Add(new ConversationMessage
            {
                Id = msgReader.GetString(msgReader.GetOrdinal("Id")),
                Type = (MessageType)msgReader.GetInt32(msgReader.GetOrdinal("Type")),
                Content = msgReader.GetString(msgReader.GetOrdinal("Content")),
                Timestamp = DateTime.Parse(msgReader.GetString(msgReader.GetOrdinal("Timestamp"))),
                Metadata = msgReader.IsDBNull(msgReader.GetOrdinal("Metadata")) ? null : msgReader.GetString(msgReader.GetOrdinal("Metadata")),
            });
        }

        // Load pending questions
        using var qCmd = _connection.CreateCommand();
        qCmd.CommandText = "SELECT * FROM PendingQuestions WHERE SessionId = $sid ORDER BY SortOrder ASC";
        qCmd.Parameters.AddWithValue("$sid", sessionId);

        using var qReader = qCmd.ExecuteReader();
        while (qReader.Read())
        {
            session.PendingQuestions.Enqueue(ReadPendingQuestion(qReader));
        }

        return session;
    }

    private static PendingQuestion ReadPendingQuestion(SqliteDataReader reader)
    {
        var optionsJson = reader.IsDBNull(reader.GetOrdinal("Options")) ? null : reader.GetString(reader.GetOrdinal("Options"));
        return new PendingQuestion
        {
            Id = reader.GetString(reader.GetOrdinal("Id")),
            Question = reader.GetString(reader.GetOrdinal("Question")),
            AskedAt = DateTime.Parse(reader.GetString(reader.GetOrdinal("AskedAt"))),
            Type = (QuestionType)reader.GetInt32(reader.GetOrdinal("Type")),
            Options = optionsJson != null ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(optionsJson) : null,
        };
    }

    public void Dispose()
    {
        _connection?.Dispose();
    }
}
