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
    return ChatOpenAI(**kwargs)
