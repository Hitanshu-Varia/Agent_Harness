"use client";

type TaskStatus = "pending" | "running" | "done" | "error";

interface Task {
  id: string;
  title: string;
  agentType: string;
  status: TaskStatus;
}

export function TaskPlanView({ tasks }: { tasks: Task[] }) {
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "pending": return "bg-muted text-muted-foreground border-border";
      case "running": return "bg-blue-500/10 text-blue-500 border-blue-500/50 animate-pulse";
      case "done": return "bg-green-500/10 text-green-500 border-green-500/50";
      case "error": return "bg-destructive/10 text-destructive border-destructive/50";
      default: return "bg-muted";
    }
  };

  return (
    <div className="w-full px-4 my-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Execution Plan</div>
        <div className="flex flex-wrap items-center gap-2">
          {tasks.map((task, index) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusColor(task.status)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {task.title}
                <span className="opacity-50 ml-1">({task.agentType})</span>
              </div>
              {index < tasks.length - 1 && (
                <div className="w-4 h-[1px] bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
