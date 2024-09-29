namespace CloudStorage.Models;

public class Candidate
{
    public Content Content { get; set; }
    public string FinishReason { get; set; }
    public int Index { get; set; }
    public List<SafetyRating> SafetyRatings { get; set; }
}

public class Content
{
    public List<Part> Parts { get; set; }
    public string Role { get; set; }
}

public class Part
{
    public string Text { get; set; }
}

public class SafetyRating
{
    public string Category { get; set; }
    public string Probability { get; set; }
}

public class UsageMetadata
{
    public int PromptTokenCount { get; set; }
    public int CandidatesTokenCount { get; set; }
    public int TotalTokenCount { get; set; }
}

public class GeminiResponse
{
    public List<Candidate> Candidates { get; set; }
    public UsageMetadata UsageMetadata { get; set; }
}