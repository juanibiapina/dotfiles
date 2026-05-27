# Prevent Spotlight from indexing heavy development directories.
# Places .metadata_never_index sentinel files that macOS honors natively.
# This reduces mds_stores CPU and the feedback loop with Jamf/SentinelOne.
{
  home.file = {
    "workspace/.metadata_never_index".text = "";
    "go/.metadata_never_index".text = "";
    ".cargo/.metadata_never_index".text = "";
    ".npm/.metadata_never_index".text = "";
    ".bun/.metadata_never_index".text = "";
    "Library/Caches/.metadata_never_index".text = "";
  };
}
