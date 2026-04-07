export type SkillDirEntry = {
  name: string;
  dir: string;
  skillFile: string;
  source: string;
  sourceIndex: number;
};

export type ResolvedSkill = {
  winner: SkillDirEntry;
  shadowed: SkillDirEntry[];
};

export type SyncConfig = {
  sources: string[];
  output: string;
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
    };

export type SyncResult = {
  resolved: Map<string, ResolvedSkill>;
  created: string[];
  updated: string[];
  removed: string[];
  warnings: SyncWarning[];
};

export type DoctorIssue =
  | {
      code: 'missing-source';
      source: string;
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
    };
