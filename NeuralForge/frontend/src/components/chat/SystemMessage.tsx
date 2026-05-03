export function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center my-4 w-full px-4">
      <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {content}
      </div>
    </div>
  );
}
