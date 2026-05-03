sed -i 's/isRunning: event.session.status ===/isRunning: (event.session as Record<string, unknown>).status ===/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/taskPlan: event.plan,/taskPlan: event.plan as TaskPlan,/' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/tasks: event.plan.subtasks.reduce/tasks: (event.plan as TaskPlan).subtasks.reduce/' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.agent.agent_id/(event.agent as Agent).agent_id/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.agent/(event.agent as Agent)/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.agent_id/event.agent_id as string/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.status/event.status as string/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.task_id/event.task_id as string/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/event.token/event.token as string/g' NeuralForge/frontend/src/store/projectStore.ts
