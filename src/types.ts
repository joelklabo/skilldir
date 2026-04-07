export type RemoteAuthConfig =
  | {
      type: 'none';
    }
  | {
      type: 'bearer-env';
      env: string;
    };

export type RemoteSourceConfig = {
  type: 'remote';
  url: string;
  auth: RemoteAuthConfig;
  refreshTtlSeconds: number;
  requestTimeoutSeconds: number;
  integrity: 'required';
  label?: string;
  description?: string;
};

export type SourceConfig = string | RemoteSourceConfig;

export type RemoteSkillMetadata = {
  sourceUrl: string;
  version: string;
  digest: string;
  archiveUrl: string;
};

export type SkillDirEntry = {
  name: string;
  dir: string;
  skillFile: string;
  source: string;
  sourceIndex: number;
  remote?: RemoteSkillMetadata;
};

export type ResolvedSkill = {
  winner: SkillDirEntry;
  shadowed: SkillDirEntry[];
};

export type SyncConfig = {
  sources: SourceConfig[];
  output: string;
};

export type CliOutputOptions = {
  quiet?: boolean;
  verbose?: boolean;
};

export type DiscoverySourceMetric = {
  source: string;
  durationMs: number;
  discovered: number;
};

export type DiscoveryMetrics = {
  durationMs: number;
  perSource: DiscoverySourceMetric[];
};

export type ManagedManifest = {
  version: 1;
  managed: Record<string, string>;
};

export type LockInfo = {
  path: string;
  reason: 'already-locked';
  pid?: number;
};

export type SyncWarning =
  | {
      code: 'conflicting-unmanaged-entry';
      skill: string;
      path: string;
      expectedTarget: string;
    }
  | {
      code: 'source-missing';
      source: string;
    }
  | {
      code: 'remote-warning';
      source: string;
      message: string;
    };

export type SyncResult = {
  resolved: Map<string, ResolvedSkill>;
  created: string[];
  updated: string[];
  removed: string[];
  warnings: SyncWarning[];
  metrics?: {
    discovery: DiscoveryMetrics;
  };
};

export type DoctorIssue =
  | {
      code: 'missing-source';
      source: string;
    }
  | {
      code: 'source-permission-denied';
      path: string;
    }
  | {
      code: 'output-permission-denied';
      path: string;
    }
  | {
      code: 'manifest-corrupt';
      path: string;
    }
  | {
      code: 'broken-managed-symlink';
      skill: string;
      path: string;
      target: string;
    }
  | {
      code: 'unmanaged-output-entry';
      path: string;
    }
  | {
      code: 'shadowed-skill';
      skill: string;
      winner: string;
      shadowed: string;
    }
  | {
      code: 'remote-auth-missing';
      source: string;
      env: string;
    }
  | {
      code: 'remote-cache-corrupt';
      path: string;
    };
