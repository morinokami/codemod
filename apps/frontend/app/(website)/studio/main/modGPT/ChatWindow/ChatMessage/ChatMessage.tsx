import CompanyLogoSVG from "@/assets/icons/company_logo.svg";
import { cn } from "@/utils";
import type { LLMMessage } from "@chatbot/types";
import { useTheme } from "@context/useTheme";
// Inspired by Chatbot-UI and modified to fit the needs of this project
// @see https://github.com/mckaywrigley/chatbot-ui/blob/main/components/Chat/ChatMessage.tsx
import { CaretDown, CaretRight, User as UserIcon } from "@phosphor-icons/react";
import { Button } from "@studio/components/ui/button";
import Image from "next/image";
import { type FC, memo, useState } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import CodeBlock from "./CodeBlock";

const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);

interface Props {
  message: LLMMessage;
}

const Paragraph = ({ children }) => (
  <p className="mb-2 last:mb-0">{children}</p>
);
const Preformatted = ({ children }) => (
  <pre className="bg-transparent">{children}</pre>
);

const CodeContent = ({ inline, className, children, message, ...others }) => {
  if (message.role === "user") {
    return <Paragraph>{children}</Paragraph>;
  }

  if (children.length && children[0] === "▍") {
    return <span className="mt-1 animate-pulse cursor-default">▍</span>;
  }

  children[0] = (children[0] as string).replace("`▍`", "▍");

  if (inline) {
    return (
      <code className={className} {...others}>
        {children}
      </code>
    );
  }

  return (
    <CodeBlock
      key={Math.random()}
      language="typescript" // TODO: support multiple languages in the future
      value={String(children).replace(/\n$/, "")}
      {...others}
    />
  );
};

export const ChatMessage = ({ message }: Props) => {
  const [collapsed, setCollapsed] = useState(message.role === "user");
  const { isDark } = useTheme();

  return (
    <div className={cn("group relative mb-4 flex")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow",
        )}
      >
        {message.role === "user" ? (
          <UserIcon />
        ) : (
          <Image src={CompanyLogoSVG} alt="Codemod Logo" />
        )}
      </div>
      <Button
        className="mb-2 ml-1 h-8 w-8"
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <CaretRight /> : <CaretDown />}
      </Button>
      <div className="ml-1 mt-1 flex-1 overflow-hidden">
        {collapsed ? (
          <p className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 mb-2 truncate break-words last:mb-0 sm:text-sm">
            {message.content}
          </p>
        ) : (
          <MemoizedReactMarkdown
            className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 break-words sm:text-sm"
            remarkPlugins={[remarkGfm, remarkMath]}
            components={{
              p: Paragraph,
              pre: Preformatted,
              code: (props) => <CodeContent {...props} message={message} />,
            }}
          >
            {message.content}
          </MemoizedReactMarkdown>
        )}
      </div>
    </div>
  );
};

ChatMessage.displayName = "ChatMessage";
