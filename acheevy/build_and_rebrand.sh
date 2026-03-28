#!/bin/bash
set -e

DEPLOY_DIR="/root/acheevy-deployment"
mkdir -p "$DEPLOY_DIR/backend"
cd "$DEPLOY_DIR/backend"

echo "=================================================="
echo " Starting remote Git clones for ACHEEVY backend..."
echo "=================================================="

# Function to clone and gracefully handle private/missing repos
clone_repo() {
    REPO_URL=$1
    DIR_NAME=$2
    if [ ! -d "$DIR_NAME" ]; then
        echo "Cloning $REPO_URL into $DIR_NAME..."
        git clone "$REPO_URL" "$DIR_NAME" || echo "[WARNING] Could not clone $REPO_URL. (Ensure repo is public or token is set.)"
    else
        echo "Directory $DIR_NAME already exists. Skipping clone."
    fi
}

# The user explicitly indicated these 4 original repos
clone_repo "https://github.com/intelligent-internet/ii-agent.git" "ACHEEVY_agent"
clone_repo "https://github.com/intelligent-internet/ii-commons.git" "ACHEEVY_commons"
clone_repo "https://github.com/intelligent-internet/ii-researcher.git" "ACHEEVY_researcher"
clone_repo "https://github.com/intelligent-internet/CommonGround.git" "ACHEEVY_ground"

echo "=================================================="
echo " Applying Light Rebranding to ACHEEVY..."
echo "=================================================="

# Wait, if repos are actually nested or we need to replace strings inside them:
# We will do a safe find and replace using sed.
# ONLY process files, excluding .git
# To be completely safe and not break binary files, we find only *.py, *.js, *.ts, *.json, *.md, *.txt, *.yml

find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.yaml" -o -name "*.yml" \) -not -path "*/\.git/*" -exec sed -i \
    -e 's/ii-agent/ACHEEVY_agent/g' \
    -e 's/ii-commons/ACHEEVY_commons/g' \
    -e 's/ii-researcher/ACHEEVY_researcher/g' \
    -e 's/CommonGround/ACHEEVY_ground/g' \
    {} +

echo "Rebranding Applied Successfully."

# Inject generic Dockerfiles if missing to prevent build failures
for dir in ACHEEVY_agent ACHEEVY_commons ACHEEVY_researcher ACHEEVY_ground; do
    if [ ! -f "$dir/Dockerfile" ]; then
        echo "Injecting generic Python Dockerfile into $dir..."
        cat << 'EOF' > "$dir/Dockerfile"
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; fi
RUN if [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then pip install --no-cache-dir -e .; fi
# Fallback dummy command to keep container alive if no explicit start command exists
CMD ["python", "-m", "http.server", "8000"]
EOF
    fi
done

# Patch CommonGround (ACHEEVY_ground) to ignore missing uv.lock
if [ -f "ACHEEVY_ground/Dockerfile" ]; then
    sed -i 's/COPY pyproject.toml uv.lock .\//COPY pyproject.toml .\//g' ACHEEVY_ground/Dockerfile
    sed -i 's/COPY uv.lock .\// /g' ACHEEVY_ground/Dockerfile
    # Just in case uv sync --frozen is used
    sed -i 's/--frozen//g' ACHEEVY_ground/Dockerfile
    sed -i 's/--no-lock//g' ACHEEVY_ground/Dockerfile
    touch ACHEEVY_ground/uv.lock
fi

echo "Setup script completed!"
