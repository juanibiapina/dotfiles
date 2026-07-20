# Disable Spotlight indexing entirely on these machines.
#
# Nothing here needs Spotlight or Finder content search, and indexing
# (mds_stores) burns CPU and feeds a loop with Jamf/SentinelOne.
#
# The previous approach dropped .metadata_never_index sentinel files in heavy
# directories, but that mechanism no longer works on macOS 26 (verified: files
# under an excluded tree are still indexed). Disabling indexing at the volume
# level with mdutil is the reliable control. This runs as root on every switch;
# `mdutil -i off` is a persistent, idempotent setting.
{ ... }:

{
  system.activationScripts.postActivation.text = ''
    echo "Disabling Spotlight indexing on all volumes..." >&2
    /usr/bin/mdutil -a -i off || true
  '';
}
