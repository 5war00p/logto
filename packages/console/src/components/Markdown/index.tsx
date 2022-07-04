import { conditionalString, Optional } from '@silverhand/essentials';
import classNames from 'classnames';
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import CodeEditor from '../CodeEditor';
import GithubRawImage from './components/GithubRawImage';
import * as styles from './index.module.scss';

type Props = {
  className?: string;
  children: string;
};

const Markdown = ({ className, children }: Props) => {
  const tocIdSet = React.useRef<Set<string>>(new Set());

  const generateTocId = (text: string): Optional<string> => {
    const resolveIdCollision = (kebabCaseString: string, index = 0): string => {
      const result = `${kebabCaseString}${conditionalString(index && `-${index}`)}`;

      if (!tocIdSet.current.has(result)) {
        tocIdSet.current.add(result);

        return result;
      }

      return resolveIdCollision(kebabCaseString, index + 1);
    };

    const initialKebabCaseString = text.replace(/\s/g, '-').toLowerCase();

    return resolveIdCollision(initialKebabCaseString);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={classNames(styles.markdown, className)}
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const [, codeBlockType] = /language-(\w+)/.exec(className ?? '') ?? [];

          return inline ? (
            <code className={styles.inlineCode} {...props}>
              {children}
            </code>
          ) : (
            <CodeEditor isReadonly language={codeBlockType} value={String(children)} />
          );
        },
        img: ({ src, alt }) => {
          return <GithubRawImage src={src} alt={alt} />;
        },
        h1: ({ children }) => <h1 id={generateTocId(String(children))}>{children}</h1>,
        h2: ({ children }) => <h2 id={generateTocId(String(children))}>{children}</h2>,
        h3: ({ children }) => <h3 id={generateTocId(String(children))}>{children}</h3>,
        h4: ({ children }) => <h4 id={generateTocId(String(children))}>{children}</h4>,
        h5: ({ children }) => <h5 id={generateTocId(String(children))}>{children}</h5>,
        h6: ({ children }) => <h6 id={generateTocId(String(children))}>{children}</h6>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default memo(Markdown);
