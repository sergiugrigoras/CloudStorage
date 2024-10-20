namespace CloudStorage.ViewModels;

public interface IIdentifiable 
{
    public Guid Id { get; set; }
}

public class Identifiable: IIdentifiable 
{
    public Guid Id { get; set; }
}