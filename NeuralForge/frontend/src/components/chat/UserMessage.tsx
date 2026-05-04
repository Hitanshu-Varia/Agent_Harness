export function UserMessage({ content, timestamp }: { content: string; timestamp: string }) {
  return (
    <div className="flex justify-end my-4 w-full px-4">
      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <span className="text-[10px] opacity-70 mt-1 block text-right">{timestamp}</span>
      </div>
    </div>
  );
}
