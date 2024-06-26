import { join } from "node:path";
import type {
  FlowSettings,
  FormattedFileCommand,
  RunSettings,
} from "@codemod-com/runner";
import {
  type ArgumentRecord,
  CaseWritingService,
  type FileSystem,
} from "@codemod-com/utilities";
import { buildSurfaceAgnosticJob } from "../buildSurfaceAgnosticJob.js";

export class SurfaceAgnosticCaseService {
  protected _caseWritingService: CaseWritingService | null = null;

  public constructor(
    private readonly _fs: FileSystem,
    private readonly _runSettings: RunSettings,
    private readonly _flowSettings: FlowSettings,
    private readonly _argumentRecord: ArgumentRecord,
    private readonly _codemodHashDigest: Buffer,
  ) {}

  public async emitPreamble(): Promise<void> {
    if (!this._runSettings.dryRun || !this._runSettings.streamingEnabled) {
      return;
    }

    await this._fs.promises.mkdir(this._runSettings.outputDirectoryPath, {
      recursive: true,
    });

    const fileHandle = await this._fs.promises.open(
      join(this._runSettings.outputDirectoryPath, "case.data"),
      "w",
    );

    this._caseWritingService = new CaseWritingService(fileHandle);

    await this._caseWritingService?.writeCase({
      caseHashDigest: this._runSettings.caseHashDigest.toString("base64url"),
      codemodHashDigest: this._codemodHashDigest.toString("base64url"),
      createdAt: BigInt(Date.now()),
      absoluteTargetPath: this._flowSettings.target,
      argumentRecord: this._argumentRecord,
    });
  }

  public async emitJob(command: FormattedFileCommand): Promise<void> {
    if (
      !this._runSettings.dryRun ||
      !this._runSettings.streamingEnabled ||
      this._caseWritingService === null
    ) {
      return;
    }

    await this._caseWritingService.writeJob(
      buildSurfaceAgnosticJob(this._runSettings.outputDirectoryPath, command),
    );
  }

  public async emitPostamble(): Promise<void> {
    if (
      !this._runSettings.dryRun ||
      !this._runSettings.streamingEnabled ||
      this._caseWritingService === null
    ) {
      return;
    }

    await this._caseWritingService.finish();
  }
}
