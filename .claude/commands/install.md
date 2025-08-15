---
description: Install software for the current host using Nix configuration
---

Install $ARGUMENTS for the current host by:

1. Determining the current host and OS
2. Finding or creating appropriate nix module for the software
3. Adding the software to the host configuration or creating a new module
4. Staging files in git
5. Running `dev nix switch` to apply the configuration
6. Committing the changes to git

Follow the repository's architecture using Nix as the primary configuration management system.