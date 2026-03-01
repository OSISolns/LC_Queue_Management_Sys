import os
import json
import shutil
from datetime import datetime
import joblib

from ..config import settings

class ModelRegistryManager:
    """Manages reading and writing versions of models."""
    
    def __init__(self, base_path: str = None):
        self.base_path = base_path or settings.MODEL_REGISTRY_PATH
        os.makedirs(self.base_path, exist_ok=True)

    def _get_model_dir(self, model_type: str) -> str:
        d = os.path.join(self.base_path, model_type)
        os.makedirs(d, exist_ok=True)
        return d

    def get_latest_version(self, model_type: str) -> str:
        """Find the highest vXXXX in the model_type directory."""
        model_dir = self._get_model_dir(model_type)
        versions = [d for d in os.listdir(model_dir) if d.startswith('v') and os.path.isdir(os.path.join(model_dir, d))]
        if not versions:
            return None
        return sorted(versions)[-1]

    def increment_version(self, current_version: str) -> str:
        if not current_version:
            return "v0001"
        num = int(current_version[1:])
        return f"v{num + 1:04d}"

    def save_model(self, model_type: str, pipeline, metadata: dict, signature: dict) -> str:
        """Saves a new version of the model."""
        latest_version = self.get_latest_version(model_type)
        new_version = self.increment_version(latest_version)
        
        target_dir = os.path.join(self._get_model_dir(model_type), new_version)
        os.makedirs(target_dir)

        # Save model
        joblib.dump(pipeline, os.path.join(target_dir, 'model.joblib'))

        # Add common metadata
        metadata['version'] = new_version
        metadata['created_at'] = datetime.utcnow().isoformat()
        
        # Save metadata and signature
        with open(os.path.join(target_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
            
        with open(os.path.join(target_dir, 'signature.json'), 'w') as f:
            json.dump(signature, f, indent=2)

        return new_version

    def promote_model(self, model_type: str, version: str) -> bool:
        """Symlinks the ACTIVE pointer to a specific version."""
        model_dir = self._get_model_dir(model_type)
        target_path = os.path.join(model_dir, version)
        
        if not os.path.exists(target_path):
            raise ValueError(f"Version {version} does not exist for model {model_type}")

        active_link = os.path.join(model_dir, 'ACTIVE')
        
        # Remove existing symlink/file if it exists
        if os.path.exists(active_link) or os.path.islink(active_link):
            os.remove(active_link)
            
        # Create relative symlink
        os.symlink(version, active_link)
        return True

    def get_active_model(self, model_type: str):
        """Loads and returns the pipeline + metadata for the ACTIVE model."""
        model_dir = self._get_model_dir(model_type)
        active_link = os.path.join(model_dir, 'ACTIVE')
        
        if not os.path.exists(active_link):
            return None, None
            
        pipeline = joblib.load(os.path.join(active_link, 'model.joblib'))
        with open(os.path.join(active_link, 'metadata.json'), 'r') as f:
            metadata = json.load(f)
            
        return pipeline, metadata

registry = ModelRegistryManager()
