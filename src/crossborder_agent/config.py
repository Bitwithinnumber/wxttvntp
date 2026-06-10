from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM
    llm_provider: str = "openai"  # openai | anthropic | dashscope
    llm_model: str = "gpt-4o"
    openai_api_key: str = ""
    openai_base_url: str = ""  # 留空使用官方端点；DashScope 兼容模式可填其 base_url
    anthropic_api_key: str = ""

    # 第三方数据 API
    market_data_provider: str = "ddgs"  # ddgs（免费） | serpapi
    serpapi_api_key: str = ""  # serpapi.com - Amazon 竞品/市场数据
    sourcing_platform: str = "1688"  # 1688 | taobao（取决于 OneBound Key 开通的权限）
    onebound_api_key: str = ""  # open.onebound.cn - 1688/淘宝货源数据
    onebound_api_secret: str = ""
    exchange_rate_api_key: str = ""  # exchangerate-api.com，留空走免费开放端点

    # 持久化
    checkpoint_db: str = "checkpoints.sqlite"
    output_dir: str = "output"


@lru_cache
def get_settings() -> Settings:
    return Settings()
