1. **Backend Schemas**:
   - Create `backend/schemas/system.py` to define Pydantic schemas: `HardwareInfo`, `CapacityReport`, `ResourceSnapshot`, and `ResourceCost`. Includes nested structures (like GPU info within HardwareInfo).

2. **Backend Services**:
   - Create/Modify `backend/services/hardware_evaluator.py`.
   - Implement `HardwareEvaluator` class.
   - Implement `get_system_info()` using `psutil`, `GPUtil`, and `py-cpuinfo`.
   - Implement `evaluate_capacity(hardware: HardwareInfo)` according to tier rules.
   - Implement `monitor_resources()` using `psutil` and `GPUtil`.
   - Implement `calculate_agent_resource_cost(agent_type: str, model_name: str)`.

3. **Backend Routers**:
   - Update `backend/routers/system.py` to add endpoints:
     - `GET /api/system/hardware`
     - `GET /api/system/capacity`
     - `GET /api/system/resources`
     - `WebSocket /ws/system/monitor`

4. **Frontend API**:
   - Create `frontend/src/lib/api/system.ts`.
   - Add typed API calls for the new backend endpoints using `fetch` or `axios` based on existing project conventions (assuming `fetch` or `ky` or standard setup).

5. **Frontend Components**:
   - Create `frontend/src/components/system/HardwareSetupWizard.tsx` using `lucide-react`, `shadcn/ui` (or standard Tailwind HTML), and `zustand` to manage `hw_evaluated` state in `localStorage`.
   - Create `frontend/src/components/system/ResourceMonitor.tsx` to handle WebSocket connection and show live stats.

6. **Pre-commit Steps**:
   - Verify code using `make build`, `make test`, or other linters as instructed by pre-commit instructions.
