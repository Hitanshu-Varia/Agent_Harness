import os
import json
import re
from typing import List, Dict, Optional, Any

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

class BaseAgent:
    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.system_prompt = self._load_prompt()

    def _load_prompt(self) -> str:
        prompt_path = os.path.join(PROMPTS_DIR, f"{self.agent_type}.txt")
        try:
            with open(prompt_path, "r") as f:
                return f.read().strip()
        except FileNotFoundError:
            return f"You are the {self.agent_type.capitalize()} Agent."

    def format_memory_context(self, memories: List[Dict[str, Any]]) -> str:
        """
        Formats a list of retrieved memories into a context string.
        Memories are expected to be dictionaries containing 'content' and optional metadata.
        """
        if not memories:
            return ""

        context_parts = ["--- Relevant Context from Memory ---"]
        for i, memory in enumerate(memories):
            content = memory.get("content", str(memory))
            context_parts.append(f"[{i + 1}] {content}")
        context_parts.append("----------------------------------")

        return "\n".join(context_parts)

    def parse_structured_output(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extracts JSON from the provided text, handling potential markdown code fences.
        """
        if not text:
            return None

        # Look for JSON inside markdown code blocks
        json_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try parsing the whole text as JSON as a fallback
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # If we really need to find JSON, try a generic regex for anything looking like an object
            # Note: This is a simplistic approach and might not catch nested structures perfectly
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    return None
            return None

    def build_messages(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        memory_context: str = "",
        history: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, str]]:
        """
        Builds the complete message history for the LLM call.
        """
        messages = [{"role": "system", "content": self.system_prompt}]

        if history:
            messages.extend(history)

        user_message_parts = []

        if memory_context:
            user_message_parts.append(memory_context)

        if context:
            user_message_parts.append(f"Context from previous tasks:\n{json.dumps(context, indent=2)}")

        user_message_parts.append(f"Task:\n{task}")

        messages.append({
            "role": "user",
            "content": "\n\n".join(user_message_parts)
        })

        return messages

class CoordinatorAgent(BaseAgent):
    def __init__(self):
        super().__init__("coordinator")

class ArchitectAgent(BaseAgent):
    def __init__(self):
        super().__init__("architect")

class BuilderAgent(BaseAgent):
    def __init__(self):
        super().__init__("builder")

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("reviewer")

class TesterAgent(BaseAgent):
    def __init__(self):
        super().__init__("tester")

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("security")

class ResearcherAgent(BaseAgent):
    def __init__(self):
        super().__init__("researcher")

class DebuggerAgent(BaseAgent):
    def __init__(self):
        super().__init__("debugger")
