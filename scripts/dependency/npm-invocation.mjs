export function npmExecutable(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

export function npmInvocation(args, platform = process.platform, env = process.env) {
  const npm = npmExecutable(platform);
  if (platform !== "win32") {
    return { command: npm, args };
  }

  return {
    command: env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", npm, ...args],
  };
}
