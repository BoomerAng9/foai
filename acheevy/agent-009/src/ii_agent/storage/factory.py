from ii_agent.storage import BaseStorage, GCS
from ii_agent.storage.local import LocalStorage


def create_storage_client(
    storage_provider: str,
    project_id: str | None = None,
    bucket_name: str | None = None,
    custom_domain: str | None = None,
    base_path: str = "/.ii_agent/storage",
    public_base_url: str = "",
) -> BaseStorage:
    if storage_provider == "gcs":
        if not project_id or not bucket_name:
            raise ValueError(
                "GCS storage requires project_id and bucket_name. "
                "Set FILE_UPLOAD_PROJECT_ID and FILE_UPLOAD_BUCKET_NAME."
            )
        return GCS(
            project_id,
            bucket_name,
            custom_domain,
        )
    if storage_provider == "local":
        return LocalStorage(
            base_path=base_path,
            public_base_url=public_base_url,
            custom_domain=custom_domain,
        )
    raise ValueError(f"Storage provider {storage_provider} not supported")
