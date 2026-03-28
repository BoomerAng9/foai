from .config import StorageConfig
from .base import BaseStorage
from .gcs import GCS
from .local import LocalStorage


def create_storage_client(config: StorageConfig) -> BaseStorage:
    if config.storage_provider == "gcs":
        return GCS(
            config.gcs_project_id,
            config.gcs_bucket_name,
        )
    if config.storage_provider == "local":
        return LocalStorage(
            base_path=config.local_storage_path,
            public_base_url=config.local_public_base_url,
        )
    raise ValueError(f"Storage provider {config.storage_provider} not supported")