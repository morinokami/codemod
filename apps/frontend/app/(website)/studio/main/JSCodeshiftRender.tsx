import { cn } from "@/utils";
import { useWebWorker } from "@studio/hooks/useWebWorker";
import type { OffsetRange } from "@studio/schemata/offsetRangeSchemata";
import { useRangesOnTarget } from "@studio/store/useRangesOnTarget";
import { useSetActiveEventThunk } from "@studio/store/useSetActiveEventThunk";
import { useCodemodOutputStore } from "@studio/store/zustand/codemodOutput";
import { useLogStore } from "@studio/store/zustand/log";
import { useModStore } from "@studio/store/zustand/mod";
import { useSnippetStore } from "@studio/store/zustand/snippets";
import { TabNames, useViewStore } from "@studio/store/zustand/view";
import dynamic from "next/dynamic";
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useEffect,
} from "react";
import {
  BoundResizePanel,
  type PanelData,
  type PanelsRefs,
  SnippetHeader,
  type SnippetType,
} from "./PageBottomPane";
import { useSnippet } from "./SnippetUI";

const MonacoDiffEditor = dynamic(
  () => import("@studio/components/Snippet/MonacoDiffEditor"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false,
  },
);

export const useCodemodOutputUpdate = () => {
  const [webWorkerState, postMessage] = useWebWorker();
  const codemodOutput = useCodemodOutputStore();
  const { setEvents, events } = useLogStore();
  const { setHasRuntimeErrors } = useModStore();
  const { engine, inputSnippet } = useSnippetStore();
  const { internalContent } = useModStore();
  const snippetBeforeHasOnlyWhitespaces = !/\S/.test(inputSnippet);
  const codemodSourceHasOnlyWhitespaces = !/\S/.test(internalContent ?? "");

  useEffect(() => {
    postMessage(engine, internalContent ?? "", inputSnippet);
    if (snippetBeforeHasOnlyWhitespaces || codemodSourceHasOnlyWhitespaces) {
      codemodOutput.setContent("");
      setHasRuntimeErrors(false);
      setEvents([]);
    }
    if (webWorkerState.kind === "LEFT") {
      codemodOutput.setContent(webWorkerState.error.message);
      setHasRuntimeErrors(true);
      setEvents([]);
    } else {
      codemodOutput.setContent(webWorkerState.output ?? "");
      setHasRuntimeErrors(true);
      setEvents(webWorkerState.events);
    }
  }, [
    // @ts-ignore
    webWorkerState.error?.message,
    webWorkerState.kind,
    // @ts-ignore
    webWorkerState.output,
    engine,
    inputSnippet,
    internalContent,
    snippetBeforeHasOnlyWhitespaces,
    codemodSourceHasOnlyWhitespaces,
    postMessage,
  ]);

  const firstCodemodExecutionErrorEvent = events.find(
    (e) => e.kind === "codemodExecutionError",
  );

  return {
    firstCodemodExecutionErrorEvent,
  };
};
export const useCodeDiff = () => {
  const { inputSnippet, afterInputRanges } = useSnippetStore();
  const setRangeThunk = useRangesOnTarget();
  const { internalContent } = useModStore();

  const { ranges, content } = useCodemodOutputStore();
  const setActiveEventThunk = useSetActiveEventThunk();

  const { value, handleSelectionChange, onSnippetChange } = useSnippet("after");

  const { setActiveTab } = useViewStore();

  const snippetBeforeHasOnlyWhitespaces = !/\S/.test(inputSnippet);
  const codemodSourceHasOnlyWhitespaces = !/\S/.test(internalContent ?? "");

  const onSelectionChange = useCallback(
    (range: OffsetRange) => {
      setRangeThunk({
        target: "CODEMOD_OUTPUT",
        ranges: [range],
      });
    },
    [setRangeThunk],
  );

  const { firstCodemodExecutionErrorEvent } = useCodemodOutputUpdate();

  const onDebug = () => {
    firstCodemodExecutionErrorEvent?.hashDigest &&
      setActiveEventThunk(firstCodemodExecutionErrorEvent.hashDigest);
    setActiveTab(TabNames.DEBUG);
  };

  const originalEditorProps = {
    highlights: afterInputRanges,
    onSelectionChange: handleSelectionChange,
    onChange: onSnippetChange,
    value,
  };

  const modifiedEditorProps = {
    highlights: ranges,
    onSelectionChange,
    value: content ?? "",
  };

  return {
    codemodSourceHasOnlyWhitespaces,
    snippetBeforeHasOnlyWhitespaces,
    firstCodemodExecutionErrorEvent,
    onDebug,
    originalEditorProps,
    modifiedEditorProps,
  };
};

export type LiveCodemodResultProps = Pick<
  ReturnType<typeof useCodeDiff>,
  "originalEditorProps" | "modifiedEditorProps"
>;

export const DiffEditorWrapper = ({
  originalEditorProps,
  modifiedEditorProps,
  type,
}: Pick<LiveCodemodResultProps, "originalEditorProps" | "modifiedEditorProps"> &
  PropsWithChildren<{
    warnings?: ReactNode;
    type: SnippetType;
  }>) => {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col w-[200%]",
        type === "after" ? "mr-[-50%]" : "ml-[-100%]",
        `${type}-shown`,
      )}
    >
      <div className="relative flex h-full w-full flex-col">
        <MonacoDiffEditor
          renderSideBySide={type === "after"}
          originalModelPath="original.tsx"
          modifiedModelPath="modified.tsx"
          options={{
            readOnly: true,
            originalEditable: true,
          }}
          loading={false}
          originalEditorProps={originalEditorProps}
          modifiedEditorProps={modifiedEditorProps}
        />
      </div>
    </div>
  );
};

const CodeSnippedPanel = ({
  children,
  header,
  className,
  panelData,
  defaultSize,
  panelRefs,
  warnings,
}: PropsWithChildren<{
  className?: string;
  header: string;
  defaultSize: number;
  panelRefs: PanelsRefs;
  panelData: PanelData;
  warnings?: ReactNode;
}>) => {
  return (
    <BoundResizePanel
      className={cn(
        "visibilityOptions" in panelData && "collapsable_panel",
        className,
      )}
      boundedIndex={panelData.boundIndex}
      defaultSize={defaultSize}
      panelRefIndex={panelData.snippedIndex}
      panelRefs={panelRefs}
    >
      <SnippetHeader
        visibilityOptions={panelData.visibilityOptions}
        title={header}
      />
      {warnings}
      {children}
    </BoundResizePanel>
  );
};

export default CodeSnippedPanel;
