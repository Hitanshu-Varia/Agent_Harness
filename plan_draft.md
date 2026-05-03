1. **Add `sentence-transformers` and `redis` to requirements:**
   - Update `NeuralForge/backend/requirements.txt` to include `sentence-transformers` and any specific versions needed. Since it's lazy-loaded, we will add it.

2. **Update `database.py`:**
   - Add initialization of ChromaDB and Redis clients alongside SQLAlchemy.

3. **Implement `Embedding Service` (`backend/services/embedder.py`):**
   - Create class with `embed` method.
   - Lazy load `sentence-transformers` model `all-MiniLM-L6-v2`.
   - Fallback to ChromaDB's default embedding if unavailable.

4. **Implement `Memory Manager` (`backend/services/memory_manager.py`):**
   - Implements 3 memory tiers: Working Memory (Redis), Episodic Memory (ChromaDB `episodes_{project_id}`), and Knowledge Base (ChromaDB `knowledge_{project_id}`).
   - Implement `store_episode`, `retrieve_relevant`, `build_memory_context`, `add_knowledge`, `compress_memory`, `set_working_context`, `get_working_context`, `store_task_result`, `get_task_result`, `clear_project_memory`.

5. **Implement REST endpoints (`backend/routers/memory.py`):**
   - Create endpoints for `episodes`, `knowledge`, `search`, `compress`, `clear`.
   - Wire them to FastAPI via DI (dependency injection).

6. **Update `main.py`:**
   - Initialize `MemoryManager` as a singleton in the FastAPI `lifespan` context.
   - Wire it up appropriately.

7. **Frontend Implementation (`frontend/src/components/memory/KnowledgeBase.tsx`):**
   - Implement the memory UI component with split view (Episodes tab + Knowledge tab).
   - Add semantic search capabilities and buttons to manually add/delete knowledge.

8. **Pre-commit checks:**
   - Verify that all code changes follow project conventions. Run pre-commit instructions.
