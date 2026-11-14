export class PrereleaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "PrereleaseError";
  }
}

export class PrereleaseOptionRequiredError extends PrereleaseError {
  readonly option: string;
  readonly requiredOption: string;

  constructor(option: string, requiredOption: string) {
    super(`Option ${option} requires ${requiredOption}`);

    this.name = "PrereleaseOptionRequiredError";
    this.option = option;
    this.requiredOption = requiredOption;
  }
}

export class PrereleaseOptionsConflictError extends PrereleaseError {
  readonly options: readonly [string, string];

  constructor(option1: string, option2: string) {
    super(`Options ${option1} and ${option2} cannot be used together`);

    this.name = "PrereleaseOptionsConflictError";
    this.options = [option1, option2];
  }
}

export class PrereleaseInvalidChannelInStateError extends PrereleaseError {
  readonly channel: string;
  readonly knownChannels: readonly string[];

  constructor(channel: string, knownChannels: readonly string[]) {
    super(
      `Unknown prerelease channel "${channel}" in state. Known channels: ${knownChannels.join(", ")}`,
    );

    this.name = "PrereleaseInvalidChannelInStateError";
    this.channel = channel;
    this.knownChannels = knownChannels;
  }
}

export class PrereleaseNoChannelsConfiguredError extends PrereleaseError {
  constructor() {
    super("No prerelease channels configured");

    this.name = "PrereleaseNoChannelsConfiguredError";
  }
}

export class PrereleaseInvalidScopeError extends PrereleaseError {
  readonly scopeName: string;
  readonly knownScopeNames: readonly string[];

  constructor(scopeName: string, knownScopeNames: readonly string[]) {
    super(
      `Unknown independent scope "${scopeName}". Known independent scopes: ${knownScopeNames.join(", ")}`,
    );

    this.name = "PrereleaseInvalidScopeError";
    this.scopeName = scopeName;
    this.knownScopeNames = knownScopeNames;
  }
}

export class PrereleaseInvalidGroupError extends PrereleaseError {
  readonly groupName: string;
  readonly knownGroupNames: readonly string[];

  constructor(groupName: string, knownGroupNames: readonly string[]) {
    super(`Unknown group "${groupName}". Known groups: ${knownGroupNames.join(", ")}`);

    this.name = "PrereleaseInvalidGroupError";
    this.groupName = groupName;
    this.knownGroupNames = knownGroupNames;
  }
}

export class PrereleaseInvalidCurrentChannelError extends PrereleaseError {
  readonly channel: string;
  readonly knownChannels: readonly string[];

  constructor(channel: string, knownChannels: readonly string[]) {
    super(
      `Unknown current prerelease channel "${channel}". Known channels: ${knownChannels.join(", ")}`,
    );

    this.name = "PrereleaseInvalidCurrentChannelError";
    this.channel = channel;
    this.knownChannels = knownChannels;
  }
}

export class PrereleaseInvalidTargetChannelError extends PrereleaseError {
  readonly channel: string;
  readonly allowedChannels: readonly string[];

  constructor(channel: string, allowedChannels: readonly string[]) {
    super(
      `Prerelease channel "${channel}" is not allowed. Allowed channels: ${allowedChannels.join(", ")}`,
    );

    this.name = "PrereleaseInvalidTargetChannelError";
    this.channel = channel;
    this.allowedChannels = allowedChannels;
  }
}

export class PrereleaseDowngradeChannelError extends PrereleaseError {
  readonly currentChannel: string;
  readonly targetChannel: string;
  readonly channelOrder: readonly string[];

  constructor(currentChannel: string, targetChannel: string, channelOrder: readonly string[]) {
    super(
      `Cannot downgrade prerelease channel from "${currentChannel}" to "${targetChannel}". Channel order: ${channelOrder.join(" < ")}`,
    );

    this.name = "PrereleaseDowngradeChannelError";
    this.currentChannel = currentChannel;
    this.targetChannel = targetChannel;
    this.channelOrder = channelOrder;
  }
}

export class PrereleaseStateMismatchError extends PrereleaseError {
  readonly channels: Readonly<Record<string, string | undefined>>;

  constructor(channels: Readonly<Record<string, string | undefined>>) {
    const states = Object.entries(channels)
      .map(([scopeName, channel]) => `${scopeName} (${channel ?? "no prerelease"})`)
      .join(", ");

    super(`Fixed scopes must share the same prerelease state: ${states}`);

    this.name = "PrereleaseStateMismatchError";
    this.channels = channels;
  }
}
