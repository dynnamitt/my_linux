#!/bin/bash

ENTUR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOBEK_PORT=37999
SHEPET_PORT=37998
HATHOR_PORT=5000
POSTGRES_PORT=37433
TIMEOUT_SECS=70 # slow string-boot

SPINNER='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

get_user_shell() {
  local shell_name
  shell_name=$(basename "${SHELL:-/bin/bash}")
  # Verify shell exists, fallback to bash
  command -v "$shell_name" >/dev/null 2>&1 && echo "$shell_name" || echo "bash"
}

USER_SHELL=$(get_user_shell)

declare -A REPOS=(
  [sobek]="git@github.com:entur/sobek.git"
  [shepet]="git@github.com:entur/shepet.git"
  [hathor]="git@github.com:entur/hathor.git"
)

ensure_repos() {
  for name in "${!REPOS[@]}"; do
    local dir="$ENTUR_DIR/$name"
    if [ ! -d "$dir" ]; then
      echo "Cloning $name..."
      git clone "${REPOS[$name]}" "$dir" || { echo "Failed to clone $name"; exit 1; }
    fi
  done
}

is_port_open() {
  # Use bash /dev/tcp - no nc required
  (echo >/dev/tcp/localhost/"$1") 2>/dev/null
}

wait_for_port() {
  local port=$1 name=$2 elapsed=0 i=0
  printf "Waiting for %s " "$name"
  while ! is_port_open "$port"; do
    printf "\b${SPINNER:i++%${#SPINNER}:1}"
    sleep 1
    ((elapsed++))
    if ((elapsed >= TIMEOUT_SECS)); then
      printf "\n%s timed out after %ds\n" "$name" "$TIMEOUT_SECS"
      return 1
    fi
  done
  printf "\b ready (%ds)\n" "$elapsed"
}

# NOTE: KITTY-terminal
# See https://sw.kovidgoyal.net/kitty/binary/
launch_tab() {
  local title=$1 cwd=$2 cmd=$3
  kitty @ launch --type=tab --tab-title="$title" --cwd="$cwd" "$USER_SHELL" -ic "$cmd; exec $USER_SHELL"
}

start_postgres() {
  is_port_open "$POSTGRES_PORT" && {
    echo "PostgreSQL already running on port $POSTGRES_PORT"
    return 0
  }
  echo "Starting PostgreSQL..."
  launch_tab "PostgreSQL" "$ENTUR_DIR/sobek" "trap 'docker compose down' EXIT; docker compose up"
  wait_for_port "$POSTGRES_PORT" "PostgreSQL"
}

start_sobek() {
  if [ -z "$AUTOSYS_API_API_KEY" ]; then
    echo "---------------"
    echo "Warning: AUTOSYS_API_API_KEY not set"
    echo "---------------"
    echo
    echo "Continue?"
    pause
  fi
  is_port_open "$SOBEK_PORT" && {
    echo "Sobek already running on http://localhost:$SOBEK_PORT"
    return 0
  }
  echo "Starting Sobek..."
  rm -f "$ENTUR_DIR/sobek/target/classes/"*.xml "$ENTUR_DIR/sobek/target/classes/"*.properties 2>/dev/null
  launch_tab "Sobek" "$ENTUR_DIR/sobek" "mvn clean install -DskipTests && mvn -pl sobek-app spring-boot:run"
  wait_for_port "$SOBEK_PORT" "Sobek"
}

start_shepet() {
  is_port_open "$SHEPET_PORT" && {
    echo "Shepet already running on http://localhost:$SHEPET_PORT"
    return 0
  }
  echo "Starting Shepet..."
  launch_tab "Shepet" "$ENTUR_DIR/shepet" "mvn clean install -DskipTests && mvn -pl shepet-app spring-boot:run -Dspring-boot.run.profiles=test,local"
  wait_for_port "$SHEPET_PORT" "Shepet"
}

start_hathor() {
  is_port_open "$HATHOR_PORT" && {
    echo "Hathor already running on http://localhost:$HATHOR_PORT"
    return 0
  }
  echo "Starting Hathor..."
  launch_tab "Hathor" "$ENTUR_DIR/hathor" "npm run local"
  wait_for_port "$HATHOR_PORT" "Hathor"
}

# ---------------------
#    M A I N
# ---------------------
ensure_repos
start_postgres || exit 1
start_sobek || exit 1
start_shepet || exit 1
start_hathor || exit 1
echo "Done! PostgreSQL:$POSTGRES_PORT | Sobek:$SOBEK_PORT | Shepet:$SHEPET_PORT | Hathor:$HATHOR_PORT"
