"""Firestore client with tenant-namespaced access."""

from google.cloud import firestore

_db: firestore.Client | None = None


def get_db() -> firestore.Client:
    global _db
    if _db is None:
        _db = firestore.Client(project="foai-aims")
    return _db


def tenant_collection(
    collection: str, tenant_id: str, *subcollections: str
) -> firestore.CollectionReference:
    """Return a tenant-namespaced Firestore collection reference.

    Example: tenant_collection("agents", "cti", "Edu_Ang")
    -> agents/cti/Edu_Ang
    """
    ref = get_db().collection(collection).document(tenant_id)
    for sub in subcollections:
        ref = ref.collection(sub)
    # If no subcollections, return the subcollection implied by the path
    if not subcollections:
        return get_db().collection(collection)
    return ref
