sed -i 's/events: any\[\]/events: unknown\[\]/g' NeuralForge/frontend/src/lib/ws/useProjectSocket.ts
sed -i 's/lastEvent: any | null/lastEvent: unknown | null/g' NeuralForge/frontend/src/lib/ws/useProjectSocket.ts
sed -i 's/send = useCallback((message: any) => {/send = useCallback((message: unknown) => {/g' NeuralForge/frontend/src/lib/ws/useProjectSocket.ts

sed -i 's/session: any | null;/session: unknown | null;/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/messages: any\[\];/messages: unknown\[\];/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/handleSocketEvent: (event: any) => void;/handleSocketEvent: (event: Record<string, unknown>) => void;/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/handleSocketEvent: (event: any) => {/handleSocketEvent: (event: Record<string, unknown>) => {/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/(acc: any, task: SubTask)/(acc: Record<string, unknown>, task: SubTask)/g' NeuralForge/frontend/src/store/projectStore.ts
sed -i 's/set((state) => ({/set(() => ({/g' NeuralForge/frontend/src/store/projectStore.ts

sed -i 's/any/unknown/g' NeuralForge/frontend/src/components/memory/KnowledgeBase.tsx
