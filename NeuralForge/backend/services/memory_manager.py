import time
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import uuid

from services.embedder import embedder
from services.api_manager import APIManager
import chromadb
from database import redis_client, chroma_client


class MemoryItem:
    def __init__(self, id: str, content: str, source: str, metadata: dict, timestamp: float, similarity: float = 0.0):
        self.id = id
        self.content = content
        self.source = source
        self.metadata = metadata
        self.timestamp = timestamp
        self.similarity = similarity

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "source": self.source,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "similarity": self.similarity
        }


class MemoryManager:
    def __init__(self, redis_client=redis_client, chroma_client=chroma_client, api_manager: APIManager = None):
        self.redis = redis_client
        self.chroma = chroma_client
        self.api_manager = api_manager

    def _get_episodes_collection_name(self, project_id: str) -> str:
        # ChromaDB collection names must be alphanumeric and underscores, 3-63 chars
        safe_id = project_id.replace('-', '_')
        return f"episodes_{safe_id}"

    def _get_knowledge_collection_name(self, project_id: str) -> str:
        safe_id = project_id.replace('-', '_')
        return f"knowledge_{safe_id}"

    # --- Episodic and Knowledge Base Methods ---
    async def _get_collection(self, collection_name: str):
        try:
            return await self.chroma.get_collection(collection_name)
        except chromadb.errors.InvalidCollectionException:
            return await self.chroma.create_collection(name=collection_name)

    async def store_episode(self, project_id: str, content: str, agent_type: str, task_id: str, importance: float = 0.5):
        collection_name = self._get_episodes_collection_name(project_id)
        collection = await self._get_collection(collection_name)

        doc_id = str(uuid.uuid4())
        embeddings = await embedder.embed([content])
        timestamp = time.time()

        await collection.add(
            ids=[doc_id],
            embeddings=embeddings,
            documents=[content],
            metadatas=[{
                "agent_type": agent_type,
                "task_id": task_id,
                "importance_score": importance,
                "timestamp": timestamp,
                "type": "episode"
            }]
        )

    async def add_knowledge(self, project_id: str, content: str, source: str, tags: List[str] = []):
        collection_name = self._get_knowledge_collection_name(project_id)
        collection = await self._get_collection(collection_name)

        doc_id = str(uuid.uuid4())
        embeddings = await embedder.embed([content])
        timestamp = time.time()

        await collection.add(
            ids=[doc_id],
            embeddings=embeddings,
            documents=[content],
            metadatas=[{
                "source": source,
                "tags": ",".join(tags),
                "timestamp": timestamp,
                "type": "knowledge"
            }]
        )

    async def retrieve_relevant(self, project_id: str, query: str, n_results: int = 5, memory_type: str = "all") -> List[MemoryItem]:
        query_embedding = await embedder.embed([query])
        results = []

        current_time = time.time()

        async def fetch_and_score(collection_name):
            try:
                collection = await self.chroma.get_collection(collection_name)
            except chromadb.errors.InvalidCollectionException:
                return []

            res = await collection.query(
                query_embeddings=query_embedding,
                n_results=n_results
            )

            items = []
            if res and res["ids"] and len(res["ids"]) > 0:
                for i in range(len(res["ids"][0])):
                    doc_id = res["ids"][0][i]
                    content = res["documents"][0][i]
                    metadata = res["metadatas"][0][i] if res["metadatas"] else {}
                    distance = res["distances"][0][i] if res["distances"] else 1.0

                    similarity = max(0.0, 1.0 - distance)

                    # Compute recency score based on timestamp in metadata
                    item_time = metadata.get("timestamp", current_time)
                    age_seconds = current_time - item_time
                    # simple exponential decay, e.g., halflife of 1 day (86400s)
                    time_decay = max(0.0, min(1.0, 1.0 / (1.0 + age_seconds / 86400)))

                    recency_score = similarity * 0.7 + time_decay * 0.3

                    item = MemoryItem(
                        id=doc_id,
                        content=content,
                        source=metadata.get("agent_type") or metadata.get("source", "unknown"),
                        metadata=metadata,
                        timestamp=item_time,
                        similarity=recency_score
                    )
                    items.append(item)
            return items

        if memory_type in ["all", "episodic"]:
            results.extend(await fetch_and_score(self._get_episodes_collection_name(project_id)))

        if memory_type in ["all", "knowledge"]:
            results.extend(await fetch_and_score(self._get_knowledge_collection_name(project_id)))

        # Sort by composite score (recency_score) descending
        results.sort(key=lambda x: x.similarity, reverse=True)
        return results[:n_results]

    async def build_memory_context(self, project_id: str, current_task: str, agent_type: str) -> str:
        episodes = await self.retrieve_relevant(project_id, current_task, n_results=5, memory_type="episodic")
        knowledge = await self.retrieve_relevant(project_id, current_task, n_results=3, memory_type="knowledge")

        context_parts = ["=== Relevant Memory ==="]
        for ep in episodes:
            context_parts.append(f"[Episode] {ep.source} wrote: {ep.content}")

        for kn in knowledge:
            context_parts.append(f"[Knowledge] {kn.content}")

        context_parts.append("===========================")
        return "\n".join(context_parts)

    async def compress_memory(self, project_id: str):
        if not self.api_manager:
            return

        collection_name = self._get_episodes_collection_name(project_id)
        try:
            collection = await self.chroma.get_collection(collection_name)
        except chromadb.errors.InvalidCollectionException:
            return

        count = await collection.count()
        if count <= 1000:
            return

        # Simplistic approach to compress oldest 200 items into 20 summaries
        # In a real system, we might query and sort by timestamp, but ChromaDB doesn't natively support sorting by metadata in get().
        # We fetch a larger chunk and sort locally
        res = await collection.get(limit=1000)
        if not res["ids"]:
            return

        items = []
        for i in range(len(res["ids"])):
            items.append({
                "id": res["ids"][i],
                "content": res["documents"][i],
                "metadata": res["metadatas"][i] if res["metadatas"] else {}
            })

        # Sort by timestamp ascending (oldest first)
        items.sort(key=lambda x: x["metadata"].get("timestamp", 0))

        oldest_200 = items[:200]
        ids_to_delete = [item["id"] for item in oldest_200]

        # Batch oldest into groups of 10
        summaries = []
        for i in range(0, len(oldest_200), 10):
            batch = oldest_200[i:i+10]
            batch_text = "\n".join([f"- {b['content']}" for b in batch])

            messages = [
                {"role": "system", "content": "Summarize the following interaction history into a concise memory item. Keep important facts, decisions, and outcomes."},
                {"role": "user", "content": batch_text}
            ]

            # Simple summarization via API Manager
            try:
                # Need a db context if required, assuming api_manager can work without for simple calls or passing None
                response_chunks = []
                async for chunk in self.api_manager.call_llm(
                    db=None,
                    provider="openai",
                    model="gpt-4o-mini",
                    messages=messages,
                    stream=False
                ):
                    if isinstance(chunk, str):
                        response_chunks.append(chunk)
                    elif isinstance(chunk, dict) and "content" in chunk:
                        response_chunks.append(chunk["content"])

                summary = "".join(response_chunks)
                if summary:
                    summaries.append(summary)
            except Exception as e:
                print(f"Error compressing memory: {e}")

        # Delete old items
        if ids_to_delete:
            await collection.delete(ids=ids_to_delete)

        # Add new summaries back to episodic
        for summary in summaries:
            await self.store_episode(project_id, summary, "system", "compression", importance=0.8)

    # --- Working Memory (Redis) ---
    async def set_working_context(self, project_id: str, key: str, value: str, ttl: int = 3600):
        redis_key = f"project:{project_id}:context:{key}"
        await self.redis.set(redis_key, value, ex=ttl)

    async def get_working_context(self, project_id: str, key: str) -> Optional[str]:
        redis_key = f"project:{project_id}:context:{key}"
        return await self.redis.get(redis_key)

    async def store_task_result(self, task_id: str, result_text: str):
        redis_key = f"task:{task_id}:result"
        # Store for 24 hours as results might be needed longer than current session
        await self.redis.set(redis_key, result_text, ex=86400)

    async def get_task_result(self, task_id: str) -> Optional[str]:
        redis_key = f"task:{task_id}:result"
        return await self.redis.get(redis_key)

    async def clear_project_memory(self, project_id: str, tier: str = "working"):
        if tier == "working":
            # Clear redis keys for project
            cursor = 0
            pattern = f"project:{project_id}:*"
            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern)
                if keys:
                    await self.redis.delete(*keys)
                if cursor == 0:
                    break
        elif tier == "episodic":
            collection_name = self._get_episodes_collection_name(project_id)
            try:
                await self.chroma.delete_collection(collection_name)
            except Exception:
                pass
        elif tier == "knowledge":
            collection_name = self._get_knowledge_collection_name(project_id)
            try:
                await self.chroma.delete_collection(collection_name)
            except Exception:
                pass
