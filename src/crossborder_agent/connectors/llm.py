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

    try:
        _empty_dump = schema().model_dump()
    except Exception:
        _empty_dump = None

    class _Retrying:
        def invoke(self, prompt, attempts: int = 3):
            last = None
            for _ in range(attempts):
                last = structured.invoke(prompt)
                if last is None:
                    continue
                # 模型偶发调用工具但传空参数，得到全默认值对象，同样视为失败重试
                if _empty_dump is not None and last.model_dump() == _empty_dump:
                    continue
                return last
            raise RuntimeError(f"LLM 结构化输出连续 {attempts} 次为空: {schema.__name__}")

    return _Retrying()
