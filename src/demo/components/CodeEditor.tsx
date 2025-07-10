import React, { useState, useEffect, useRef } from 'react';

interface CodeEditorProps {
  value: string;
  language: 'jsx' | 'css' | 'javascript';
  onChange: (value: string) => void;
  onSave?: () => void; // 新增保存回调
  placeholder?: string;
  fileId?: string; // 文件ID，用于管理独立的历史记录
  fileName?: string; // 文件名，用于检测注释类型
}

// 历史记录接口
interface HistoryEntry {
  content: string;
  timestamp: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language,
  onChange,
  onSave,
  placeholder = '请输入代码...',
  fileId,
  fileName
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);

  // 使用Map来为每个文件存储独立的历史记录
  const fileHistoriesRef = useRef<Map<string, { history: HistoryEntry[], index: number }>>(new Map());
  const lastValueRef = useRef<string>('');
  const isUndoRedoRef = useRef<boolean>(false);

  // 获取当前文件的历史记录
  const getCurrentFileHistory = () => {
    if (!fileId) return { history: [], index: -1 };

    if (!fileHistoriesRef.current.has(fileId)) {
      fileHistoriesRef.current.set(fileId, { history: [], index: -1 });
    }

    return fileHistoriesRef.current.get(fileId)!;
  };

  // 更新当前文件的历史记录
  const updateCurrentFileHistory = (history: HistoryEntry[], index: number) => {
    if (!fileId) return;

    fileHistoriesRef.current.set(fileId, { history, index });
  };

  // 添加历史记录的函数
  const addToHistory = (content: string) => {
    if (isUndoRedoRef.current || !fileId) return; // 如果是撤销/重做操作或没有fileId，不添加到历史

    const currentFileHistory = getCurrentFileHistory();
    const newEntry: HistoryEntry = {
      content,
      timestamp: Date.now()
    };

    // 如果当前不在历史记录的末尾，截断后面的记录
    const newHistory = currentFileHistory.index >= 0 ?
      currentFileHistory.history.slice(0, currentFileHistory.index + 1) :
      currentFileHistory.history;

    // 避免连续重复的记录
    if (newHistory.length > 0 && newHistory[newHistory.length - 1].content === content) {
      return;
    }

    // 限制历史记录数量
    const updatedHistory = [...newHistory, newEntry];
    const finalHistory = updatedHistory.slice(-50); // 最多保留50条记录
    const newIndex = finalHistory.length - 1;

    updateCurrentFileHistory(finalHistory, newIndex);
  };

  // 当value发生变化且不是撤销/重做操作时，添加到历史记录
  useEffect(() => {
    if (value !== lastValueRef.current && !isUndoRedoRef.current) {
      if (value) {
        addToHistory(value);
      }
      lastValueRef.current = value;
    }
    isUndoRedoRef.current = false; // 重置标志
  }, [value, fileId]);

  // 撤销操作
  const handleUndo = () => {
    const currentFileHistory = getCurrentFileHistory();

    if (currentFileHistory.index > 0) {
      isUndoRedoRef.current = true;
      const newIndex = currentFileHistory.index - 1;
      const previousEntry = currentFileHistory.history[newIndex];

      updateCurrentFileHistory(currentFileHistory.history, newIndex);
      onChange(previousEntry.content);
    }
  };

  // 重做操作
  const handleRedo = () => {
    const currentFileHistory = getCurrentFileHistory();

    if (currentFileHistory.index < currentFileHistory.history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = currentFileHistory.index + 1;
      const nextEntry = currentFileHistory.history[newIndex];

      updateCurrentFileHistory(currentFileHistory.history, newIndex);
      onChange(nextEntry.content);
    }
  };

  // 计算行号
  useEffect(() => {
    // 如果value为空，至少显示一行
    if (!value.trim()) {
      setLineNumbers(['1']);
      return;
    }

    const lines = value.split('\n');
    // 确保至少有一行
    const lineCount = Math.max(lines.length, 1);
    const numbers = Array.from({ length: lineCount }, (_, index) => (index + 1).toString());
    setLineNumbers(numbers);
  }, [value]);

  // 同步编辑器内容
  useEffect(() => {
    // 在中文输入过程中不要更新DOM，避免打断IME状态
    if (editorRef.current && !isComposing) {
      const editor = editorRef.current;
      const currentContent = getEditorTextContent(editor);

      // 只有当内容真正不同时才进行更新
      if (currentContent !== value) {
        const selection = window.getSelection();
        let startOffset = 0;
        let endOffset = 0;

        // 安全地获取当前光标位置
        if (selection && selection.rangeCount > 0) {
          try {
            const range = selection.getRangeAt(0);
            startOffset = getTextOffset(editor, range.startContainer, range.startOffset);
            endOffset = getTextOffset(editor, range.endContainer, range.endOffset);
          } catch (e) {
            // 忽略获取选择范围的错误
          }
        }

        // 使用更温和的方式设置内容，避免破坏IME状态
        setEditorContent(editor, value);

        // 只在内容不为空且有光标位置时恢复光标
        if (selection && value && (startOffset > 0 || endOffset > 0)) {
          try {
            // 延迟恢复光标，避免与IME冲突
            setTimeout(() => {
              if (!isComposing) {
                restoreCursor(editor, startOffset, endOffset);
              }
            }, 0);
          } catch (e) {
            // 忽略光标位置恢复错误，将光标放到末尾
            try {
              const range = document.createRange();
              const lastNode = editor.lastChild;
              if (lastNode) {
                if (lastNode.nodeType === Node.TEXT_NODE) {
                  range.setStart(lastNode, (lastNode.textContent || '').length);
                } else {
                  range.setStartAfter(lastNode);
                }
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            } catch (e2) {
              // 如果所有光标恢复都失败，不做任何操作
            }
          }
        }
      }
    }
  }, [value, isComposing]);

  // 获取编辑器的文本内容，简化处理提高中文输入兼容性
  const getEditorTextContent = (editor: HTMLDivElement): string => {
    // 使用innerText获取更准确的文本内容，保持换行符
    return editor.innerText || '';
  };

  // 设置编辑器内容，简化处理提高中文输入兼容性
  const setEditorContent = (editor: HTMLDivElement, content: string) => {
    // 只在非输入状态时更新内容
    if (!isComposing) {
      editor.textContent = content;
    }
  };

  // 获取文本偏移量
  const getTextOffset = (editor: HTMLDivElement, container: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let node = walker.nextNode();
    while (node && node !== container) {
      if (node.nodeType === Node.TEXT_NODE) {
        textOffset += (node.textContent || '').length;
      } else if (node.nodeName === 'BR') {
        textOffset += 1;
      }
      node = walker.nextNode();
    }

    if (node === container && container.nodeType === Node.TEXT_NODE) {
      textOffset += offset;
    }

    return textOffset;
  };

  // 恢复光标位置
  const restoreCursor = (editor: HTMLDivElement, startOffset: number, endOffset: number) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let currentOffset = 0;
    let startSet = false;
    let endSet = false;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let node = walker.nextNode();
    while (node && (!startSet || !endSet)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = (node.textContent || '').length;
        if (!startSet && currentOffset + nodeLength >= startOffset) {
          range.setStart(node, startOffset - currentOffset);
          startSet = true;
        }
        if (!endSet && currentOffset + nodeLength >= endOffset) {
          range.setEnd(node, endOffset - currentOffset);
          endSet = true;
        }
        currentOffset += nodeLength;
      } else if (node.nodeName === 'BR') {
        if (!startSet && currentOffset >= startOffset) {
          range.setStartBefore(node);
          startSet = true;
        }
        if (!endSet && currentOffset >= endOffset) {
          range.setEndBefore(node);
          endSet = true;
        }
        currentOffset += 1;
      }
      node = walker.nextNode();
    }

    if (startSet && endSet) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // 处理行号点击，将光标定位到对应行
  const handleLineClick = (lineIndex: number) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const lines = value.split('\n');

    // 计算到目标行的字符偏移量
    let offset = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    // 定位光标到行首
    try {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();

        // 遍历编辑器的文本节点找到正确位置
        let currentOffset = 0;
        const walker = document.createTreeWalker(
          editor,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          null
        );

        let node = walker.nextNode();
        while (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = (node.textContent || '').length;
            if (currentOffset + nodeLength >= offset) {
              range.setStart(node, offset - currentOffset);
              range.setEnd(node, offset - currentOffset);
              break;
            }
            currentOffset += nodeLength;
          } else if (node.nodeName === 'BR') {
            if (currentOffset >= offset) {
              range.setStartBefore(node);
              range.setEndBefore(node);
              break;
            }
            currentOffset += 1;
          }
          node = walker.nextNode();
        }

        selection.removeAllRanges();
        selection.addRange(range);
        editor.focus();
      }
    } catch (err) {
      // 如果定位失败，直接focus编辑器
      editor.focus();
    }
  };

  // 获取当前行的缩进
  const getCurrentLineIndent = (text: string, cursorPosition: number): string => {
    const lines = text.substring(0, cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    const match = currentLine.match(/^(\s*)/);
    return match ? match[1] : '';
  };

  // 根据文件类型获取注释符号
  const getCommentSymbols = () => {
    if (!fileName) {
      return { start: '// ', end: '' };
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
        return { start: '<!-- ', end: ' -->' };
      case 'css':
        return { start: '/* ', end: ' */' };
      case 'jsx':
      case 'tsx':
      case 'js':
      case 'ts':
      default:
        return { start: '// ', end: '' };
    }
  };

  // 切换注释
  const handleToggleComment = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const editor = editorRef.current;
    const currentContent = getEditorTextContent(editor);
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // 没有选中内容，注释/取消注释当前行
      toggleCurrentLineComment(currentContent, range);
    } else {
      // 有选中内容，注释/取消注释选中的行
      toggleSelectedLinesComment(currentContent, range);
    }
  };

  // 注释/取消注释当前行
  const toggleCurrentLineComment = (content: string, range: Range) => {
    const editor = editorRef.current!;
    const currentOffset = getTextOffset(editor, range.startContainer, range.startOffset);
    const lines = content.split('\n');
    
    // 找到当前行
    let lineStart = 0;
    let currentLineIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = lineStart + lines[i].length;
      if (currentOffset >= lineStart && currentOffset <= lineEnd) {
        currentLineIndex = i;
        break;
      }
      lineStart = lineEnd + 1;
    }

    const { start: commentStart, end: commentEnd } = getCommentSymbols();
    const currentLine = lines[currentLineIndex];
    const trimmedLine = currentLine.trim();

    let newLine: string;
    let cursorOffset = 0;

    // 检查是否已经被注释
    if (commentEnd) {
      // 块注释 (HTML/CSS)
      if (trimmedLine.startsWith(commentStart) && trimmedLine.endsWith(commentEnd)) {
        // 取消注释
        const uncommented = trimmedLine.slice(commentStart.length, -commentEnd.length);
        const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
        newLine = leadingSpaces + uncommented;
        cursorOffset = -(commentStart.length);
      } else {
        // 添加注释
        const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
        const content = currentLine.slice(leadingSpaces.length);
        newLine = leadingSpaces + commentStart + content + commentEnd;
        cursorOffset = commentStart.length;
      }
    } else {
      // 行注释 (JS/TS/JSX/TSX)
      if (trimmedLine.startsWith(commentStart)) {
        // 取消注释
        const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
        const afterComment = currentLine.slice(leadingSpaces.length + commentStart.length);
        newLine = leadingSpaces + afterComment;
        cursorOffset = -(commentStart.length);
      } else {
        // 添加注释
        const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
        const content = currentLine.slice(leadingSpaces.length);
        newLine = leadingSpaces + commentStart + content;
        cursorOffset = commentStart.length;
      }
    }

    // 更新内容
    const newLines = [...lines];
    newLines[currentLineIndex] = newLine;
    const newContent = newLines.join('\n');
    onChange(newContent);

    // 计算新的光标位置
    const newCursorPos = Math.max(0, currentOffset + cursorOffset);
    
    // 延迟设置光标位置
    setTimeout(() => {
      if (editorRef.current) {
        restoreCursor(editorRef.current, newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // 注释/取消注释选中的行
  const toggleSelectedLinesComment = (content: string, range: Range) => {
    const editor = editorRef.current!;
    const startOffset = getTextOffset(editor, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(editor, range.endContainer, range.endOffset);
    const lines = content.split('\n');
    
    // 找到选中的行范围
    let startLineIndex = 0;
    let endLineIndex = 0;
    let charCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = charCount + lines[i].length;
      if (charCount <= startOffset && startOffset <= lineEnd && startLineIndex === 0) {
        startLineIndex = i;
      }
      if (charCount <= endOffset && endOffset <= lineEnd) {
        endLineIndex = i;
        break;
      }
      charCount = lineEnd + 1;
    }

    const { start: commentStart, end: commentEnd } = getCommentSymbols();
    
    // 检查选中的行是否都已经被注释
    let allCommented = true;
    for (let i = startLineIndex; i <= endLineIndex; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine.length > 0) { // 只检查非空行
        if (commentEnd) {
          // 块注释
          if (!(trimmedLine.startsWith(commentStart) && trimmedLine.endsWith(commentEnd))) {
            allCommented = false;
            break;
          }
        } else {
          // 行注释
          if (!trimmedLine.startsWith(commentStart)) {
            allCommented = false;
            break;
          }
        }
      }
    }

    // 应用注释/取消注释
    const newLines = [...lines];
    for (let i = startLineIndex; i <= endLineIndex; i++) {
      const currentLine = newLines[i];
      const trimmedLine = currentLine.trim();
      
      if (trimmedLine.length === 0) continue; // 跳过空行

      if (allCommented) {
        // 取消注释
        if (commentEnd) {
          // 块注释
          if (trimmedLine.startsWith(commentStart) && trimmedLine.endsWith(commentEnd)) {
            const uncommented = trimmedLine.slice(commentStart.length, -commentEnd.length);
            const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
            newLines[i] = leadingSpaces + uncommented;
          }
        } else {
          // 行注释
          if (trimmedLine.startsWith(commentStart)) {
            const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
            const afterComment = currentLine.slice(leadingSpaces.length + commentStart.length);
            newLines[i] = leadingSpaces + afterComment;
          }
        }
      } else {
        // 添加注释
        const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
        const content = currentLine.slice(leadingSpaces.length);
        if (commentEnd) {
          // 块注释
          newLines[i] = leadingSpaces + commentStart + content + commentEnd;
        } else {
          // 行注释
          newLines[i] = leadingSpaces + commentStart + content;
        }
      }
    }

    const newContent = newLines.join('\n');
    onChange(newContent);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const isCtrlPressed = e.ctrlKey || e.metaKey;

    // 处理快捷键
    if (isCtrlPressed) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          // 触发保存和立即编译
          if (onSave) {
            onSave();
          }
          return;

        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;

        case 'y':
          e.preventDefault();
          handleRedo();
          return;

        case 'x':
          e.preventDefault();
          handleCut();
          return;

        case 'c':
          e.preventDefault();
          handleCopy();
          return;

        case 'v':
          e.preventDefault();
          handlePaste();
          return;

        case '/':
          e.preventDefault();
          handleToggleComment();
          return;
      }
    }

    // 处理Tab键
    if (e.key === 'Tab') {
      e.preventDefault();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const isSelection = !range.collapsed;

        if (isSelection) {
          // 有选中内容时，进行缩进或取消缩进
          handleIndentSelection(e.shiftKey);
        } else {
          // 没有选中内容时，插入制表符
          try {
            const tabNode = document.createTextNode('  ');
            range.deleteContents();
            range.insertNode(tabNode);
            range.setStartAfter(tabNode);
            range.setEndAfter(tabNode);
            selection.removeAllRanges();
            selection.addRange(range);

            // 触发input事件
            const content = getEditorTextContent(editorRef.current!);
            onChange(content);
          } catch (e) {
            // 如果操作失败，直接在末尾插入tab
            const content = getEditorTextContent(editorRef.current!);
            onChange(content + '  ');
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // 处理自动缩进
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const currentContent = getEditorTextContent(editorRef.current!);
        const cursorPos = getTextOffset(editorRef.current!, range.startContainer, range.startOffset);
        
        // 获取当前行的缩进
        const currentIndent = getCurrentLineIndent(currentContent, cursorPos);
        
        // 检查是否需要增加缩进（例如在{后面）
        const beforeCursor = currentContent.substring(0, cursorPos);
        const lastChar = beforeCursor.trim().slice(-1);
        let extraIndent = '';
        
        if (lastChar === '{' || lastChar === '[' || lastChar === '(') {
          extraIndent = '  '; // 增加两个空格的缩进
        }
        
        try {
          // 插入换行符和缩进
          const newlineWithIndent = '\n' + currentIndent + extraIndent;
          const textNode = document.createTextNode(newlineWithIndent);
          range.deleteContents();
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);

          // 触发input事件
          const content = getEditorTextContent(editorRef.current!);
          onChange(content);
        } catch (e) {
          // 如果操作失败，使用简单的换行
          const content = getEditorTextContent(editorRef.current!);
          onChange(content + '\n' + currentIndent + extraIndent);
        }
      }
    }
  };

  // 剪切功能
  const handleCut = async () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (selection.isCollapsed) {
      // 没有选中内容时，剪切当前行
      await handleCutCurrentLine();
    } else {
      // 有选中内容时，剪切选中的内容
      const selectedText = selection.toString();

      try {
        // 复制到剪贴板
        await navigator.clipboard.writeText(selectedText);

        // 删除选中内容
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 更新编辑器内容
        const content = getEditorTextContent(editorRef.current!);
        onChange(content);
      } catch (err) {
        console.warn('剪切操作失败:', err);
      }
    }
  };

  // 剪切当前行
  const handleCutCurrentLine = async () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const editor = editorRef.current;
      const currentContent = getEditorTextContent(editor);
      const lines = currentContent.split('\n');

      // 获取当前光标位置
      const range = selection.getRangeAt(0);
      const currentOffset = getTextOffset(editor, range.startContainer, range.startOffset);

      // 计算当前行号
      let lineStart = 0;
      let currentLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (currentOffset >= lineStart && currentOffset <= lineEnd) {
          currentLine = i;
          break;
        }
        lineStart = lineEnd + 1; // +1 for newline
      }

      // 获取要剪切的行内容
      const lineTocut = lines[currentLine];
      const isLastLine = currentLine === lines.length - 1;

      // 构建剪切的文本（包括换行符，除非是最后一行）
      const cutText = isLastLine ? lineTocut : lineTocut + '\n';

      // 复制到剪贴板
      await navigator.clipboard.writeText(cutText);

      // 删除当前行
      const newLines = [...lines];
      newLines.splice(currentLine, 1);

      // 如果删除的是最后一行且不是唯一行，需要移除前一行的换行符
      let newContent = newLines.join('\n');

      // 如果删除后没有内容了，保留空字符串
      if (newLines.length === 0) {
        newContent = '';
      }

      // 更新内容
      onChange(newContent);

      // 重新定位光标
      setTimeout(() => {
        if (editorRef.current && newContent) {
          const newLines = newContent.split('\n');
          // 将光标放在当前行的开始（如果当前行还存在）或上一行的开始
          const targetLine = Math.min(currentLine, newLines.length - 1);
          let targetOffset = 0;

          for (let i = 0; i < targetLine; i++) {
            targetOffset += newLines[i].length + 1;
          }

          restoreCursor(editorRef.current, targetOffset, targetOffset);
        }
      }, 0);

    } catch (err) {
      console.warn('剪切当前行失败:', err);
    }
  };

  // 复制功能
  const handleCopy = async () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const selectedText = selection.toString();

      try {
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        console.warn('复制操作失败:', err);
      }
    }
  };

  // 粘贴功能
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 插入粘贴的文本
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        // 更新编辑器内容
        const content = getEditorTextContent(editorRef.current!);
        onChange(content);
      }
    } catch (err) {
      console.warn('粘贴操作失败:', err);
    }
  };

  // 处理选中内容的缩进
  const handleIndentSelection = (isUnindent: boolean) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (!selectedText) return;

    // 获取选中的行
    const lines = selectedText.split('\n');
    const processedLines = lines.map(line => {
      if (isUnindent) {
        // 取消缩进：移除行首的2个空格或1个tab
        if (line.startsWith('  ')) {
          return line.substring(2);
        } else if (line.startsWith('\t')) {
          return line.substring(1);
        }
        return line;
      } else {
        // 缩进：在行首添加2个空格
        return '  ' + line;
      }
    });

    const processedText = processedLines.join('\n');

    try {
      // 替换选中内容
      range.deleteContents();
      const textNode = document.createTextNode(processedText);
      range.insertNode(textNode);

      // 重新选中处理后的内容
      const newRange = document.createRange();
      newRange.setStartBefore(textNode);
      newRange.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // 更新编辑器内容
      const content = getEditorTextContent(editorRef.current!);
      onChange(content);
    } catch (err) {
      console.warn('缩进操作失败:', err);
    }
  };

  // 处理输入法事件 - 优化中文输入支持
  const handleCompositionStart = (e: React.CompositionEvent<HTMLDivElement>) => {
    console.log('🎌 开始中文输入');
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
    console.log('🎌 结束中文输入，数据：', e.data);
    setIsComposing(false);
    
    // 立即更新内容，确保中文输入结果被保存
    if (editorRef.current) {
      const content = getEditorTextContent(editorRef.current);
      console.log('🎌 输入法结束后的内容：', content);
      onChange(content);
    }
  };

  // 处理输入事件 - 优化输入响应
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    console.log('📝 handleInput 触发，isComposing:', isComposing);
    
    // 在中文输入过程中不处理，等待compositionEnd
    if (isComposing) {
      console.log('📝 正在输入中文，跳过处理');
      return;
    }
    
    // 立即处理普通输入
    if (editorRef.current) {
      const content = getEditorTextContent(editorRef.current);
      console.log('📝 普通输入内容：', content);
      
      // 检查自动补全
      handleAutoComplete(content, editorRef.current);
      
      onChange(content);
    }
  };

  // 自动补全功能
  const handleAutoComplete = (content: string, editor: HTMLDivElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const currentOffset = getTextOffset(editor, range.startContainer, range.startOffset);
    
    // 检查是否刚输入了 /*
    if (currentOffset >= 2) {
      const beforeCursor = content.substring(currentOffset - 2, currentOffset);
      
      if (beforeCursor === '/*') {
        // 检查后面是否已经有 */
        const afterCursor = content.substring(currentOffset);
        
        if (!afterCursor.startsWith(' */')) {
          // 自动补全 */
          const newContent = content.substring(0, currentOffset) + ' */' + content.substring(currentOffset);
          
          // 更新内容
          onChange(newContent);
          
          // 将光标置于 /* 和 */ 之间
          setTimeout(() => {
            if (editorRef.current) {
              restoreCursor(editorRef.current, currentOffset + 1, currentOffset + 1);
            }
          }, 0);
        }
      }
    }
  };

  const styles = {
    codeEditor: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      overflow: 'hidden',
      background: '#ffffff',
      fontSize: '14px',
      // 确保编辑器有固定高度，类似 VSCode
    },
    scrollContainer: {
      flex: 1,
      display: 'flex',
      background: '#ffffff',
      position: 'relative' as const,
      height: '100%',
      overflow: 'auto', // 整个容器可以滚动
    },
    lineNumbers: {
      background: '#f6f8fa',
      color: '#656d76',
      fontFamily: "'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace",
      fontSize: '13px',
      lineHeight: '1.45',
      textAlign: 'right' as const,
      userSelect: 'none' as const,
      minWidth: '50px',
      width: '50px',
      borderRight: '1px solid #e1e4e8',
      padding: '16px 12px',
      whiteSpace: 'pre' as const,
      flexShrink: 0,
      // 行号区域固定位置，不会水平滚动
      position: 'sticky' as const,
      left: 0,
      zIndex: 2,
      boxSizing: 'border-box' as const,
      // 行号区域高度自适应内容
      alignSelf: 'flex-start' as const,
    },
    lineNumber: {
      display: 'block',
      lineHeight: '1.45',
      fontSize: '13px',
      textAlign: 'right' as const,
      height: '18.85px', // 固定行高，与编辑器行高一致
    },
    editorContainer: {
      flex: 1,
      minWidth: 0,
      position: 'relative' as const,
      // 编辑器容器不需要独立滚动，跟随父容器
      overflow: 'visible',
      boxSizing: 'border-box' as const,
    },
    codeEditorDiv: {
      outline: 'none',
      fontFamily: "'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace",
      fontSize: '13px',
      lineHeight: '1.45',
      padding: '16px',
      background: '#ffffff',
      color: '#24292f',
      whiteSpace: 'pre-wrap' as const,
      overflowWrap: 'break-word' as const,
      wordBreak: 'normal' as const,
      tabSize: 2,
      border: 'none',
      resize: 'none' as const,
      boxSizing: 'border-box' as const,
      // 让编辑器内容可以超出容器，触发父容器滚动
      minHeight: '100%',
      height: 'auto',
      // 确保内容可以水平滚动，使用 max-content 让宽度自适应内容
      minWidth: '100%',
      width: 'max-content',
      // 优化中文输入
      WebkitUserSelect: 'text' as const,
      MozUserSelect: 'text' as const,
      userSelect: 'text' as const,
      // 添加输入法优化
      WebkitTextFillColor: 'inherit',
      WebkitOpacity: 1,
      // 禁用一些可能干扰中文输入的功能
      WebkitTextSizeAdjust: 'none' as const,
    },
    placeholder: {
      position: 'absolute' as const,
      top: '16px',
      left: '16px',
      color: '#656d76',
      pointerEvents: 'none' as const,
      fontFamily: "'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace",
      fontSize: '13px',
      lineHeight: '1.45',
    },
  };

  return (
    <div style={styles.codeEditor}>
      <div
        ref={scrollContainerRef}
        style={styles.scrollContainer}
      >
        <div style={styles.lineNumbers}>
          {lineNumbers.map((num, index) => (
            <div
              key={index}
              style={{
                ...styles.lineNumber,
                cursor: 'pointer',
                padding: '0 4px',
                minHeight: '18.85px', // 确保每行都有足够高度
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
              onClick={() => handleLineClick(index)}
              title={`跳转到第 ${num} 行`}
            >
              {num}
            </div>
          ))}
        </div>

        <div style={styles.editorContainer}>
          {!value && (
            <div style={styles.placeholder}>
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            style={styles.codeEditorDiv}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            suppressContentEditableWarning={true}
            // 优化中文输入
            inputMode="text"
            lang="zh-CN"
            // 添加更多输入法支持属性
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            // 确保输入法正常工作
            translate="no"
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 