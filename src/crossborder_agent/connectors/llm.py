from langchain_core.language_models.chat_models import BaseChatModel

from ..config import get_settings


def get_llm(temperature: float = 0.3) -> BaseChatModel:
    """按配置返回可切换的 LLM 实例（openai / anthropic / dashscope 兼容端点）。"""
    s = get_settings()
    if s.llm_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model_name=s.llm_model,
            api_key=s.anthropic_api_key,
            temperature=temperature,
            timeout=120,
            stop=None,
        )
    from langchain_openai import ChatOpenAI

    kwargs: dict = {"model": s.llm_model, "api_key": s.openai_api_key, "temperature": temperature}
    if s.openai_base_url:
        kwargs["base_url"] = s.openai_base_url
        if "deepseek" in s.openai_base_url:
            # DeepSeek 思考模式不支持强制 tool_choice，结构化输出需关闭
            kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
    return ChatOpenAI(**kwargs)


def get_structured_llm(schema, temperature: float = 0.3):
    """结构化输出 LLM。用 function_calling 以兼容 DeepSeek 等不支持 json_schema 的服务。

    模型偶发不调用工具导致返回 None，这里包一层重试。
    """
    structured = get_llm(temperature).with_structured_output(schema, method="function_calling")

    from pydantic_core import PydanticUndefined

    def _is_all_default(obj) -> bool:
        """模型偶发调用工具但只传必填参数，其余全为默认值，视为无效输出。"""
        dump = obj.model_dump()
        checked = False
        for name, f in schema.model_fields.items():
            if f.default is not PydanticUndefined:
                default = f.default
            elif f.default_factory is not None:
                default = f.default_factory()
            else:
                continue
            checked = True
            if dump.get(name) != default:
                return False
        return checked

    class _Retrying:
        def invoke(self, prompt, attempts: int = 3):
            for _ in range(attempts):
                last = structured.invoke(prompt)
                if last is None or _is_all_default(last):
                    continue
                return last
            raise RuntimeError(f"LLM 结构化输出连续 {attempts} 次为空: {schema.__name__}")

    return _Retrying()
