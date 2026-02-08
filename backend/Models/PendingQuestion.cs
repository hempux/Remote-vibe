namespace RemoteVibe.Backend.Models;

public class PendingQuestion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Question { get; set; } = string.Empty;
    public DateTime AskedAt { get; set; } = DateTime.UtcNow;
    public QuestionType Type { get; set; }
    public List<string>? Options { get; set; }
}

public enum QuestionType
{
    YesNo,
    MultipleChoice,
    FreeText
}
