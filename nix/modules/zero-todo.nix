{ pkgs, inputs, ... }:

let
  pname = "zero-todo";
  version = inputs.zero.shortRev;
  src = inputs.zero;
  pnpm = pkgs.pnpm_10;
  pnpmWorkspaces = [ "@zero/todo-cli" ];

  zero-todo = pkgs.stdenvNoCC.mkDerivation {
    inherit pname version src pnpmWorkspaces;

    pnpmDeps = pkgs.fetchPnpmDeps {
      inherit pname version src pnpm pnpmWorkspaces;
      fetcherVersion = 3;
      hash = "sha256-gCZpzbgILhzXnAr+LTj2R0H1k75KzB3nbyrRjtCfNMU=";
    };

    nativeBuildInputs = [ pkgs.nodejs pnpm pkgs.pnpmConfigHook pkgs.makeWrapper ];

    buildPhase = ''
      runHook preBuild
      pnpm --filter=@zero/todo-cli build
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      install -Dm644 packages/todo-cli/dist/zero-todo.mjs $out/lib/zero-todo/zero-todo.mjs
      makeWrapper ${pkgs.nodejs}/bin/node $out/bin/zero-todo --add-flags $out/lib/zero-todo/zero-todo.mjs
      runHook postInstall
    '';

    meta = {
      description = "Tasks and Projects in Zero's todo app from the shell";
      homepage = "https://github.com/juanibiapina/zero";
      mainProgram = "zero-todo";
    };
  };
in
{
  environment.systemPackages = [ zero-todo ];
}
