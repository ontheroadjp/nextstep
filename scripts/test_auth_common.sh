#!/usr/bin/env bash

init_auth_header() {
  TOKEN=$(node scripts/get_access_token.mjs | tr -d '\r\n')
  if [[ -z "${TOKEN}" ]]; then
    echo "Failed to get access token" 1>&2
    return 1
  fi

  header_auth=("-H" "Authorization: Bearer $TOKEN")
}
