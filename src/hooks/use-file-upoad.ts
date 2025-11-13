import { useState, useCallback, useRef } from 'react';

interface FileUploadOptions {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
  initialFiles?: Array<{
    name: string;
    size: number;
    type: string;
    url: string;
    id: string;
  }>;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

interface FileUploadState {
  files: UploadedFile[];
  isDragging: boolean;
  errors: string[];
}

interface FileUploadActions {
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  openFileDialog: () => void;
  removeFile: (id: string) => void;
  getInputProps: () => {
    type: string;
    accept: string;
    multiple: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    ref: React.RefObject<HTMLInputElement>;
  };
}

export function useFileUpload(
  options: FileUploadOptions = {}
): [FileUploadState, FileUploadActions] {
  const {
    accept = 'image/*',
    maxSize = 5 * 1024 * 1024, // 5MB default
    multiple = false,
    maxFiles = 10,
    initialFiles = [],
  } = options;

  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Convert initial files to UploadedFile format
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    return initialFiles.map(file => ({
      id: file.id,
      file: new File([], file.name, { type: file.type }),
      preview: file.url,
    }));
  });

  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (maxSize && file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`;
      }

      // Check file type
      if (accept && accept !== '*') {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension === type;
          }
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.slice(0, -1));
          }
          return fileType === type;
        });

        if (!isAccepted) {
          return `File type "${file.type}" is not accepted.`;
        }
      }

      return null;
    },
    [accept, maxSize]
  );

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newErrors: string[] = [];
      const newFiles: UploadedFile[] = [];

      const filesToProcess = Array.from(fileList);

      // Check if adding these files would exceed maxFiles
      if (files.length + filesToProcess.length > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed.`);
        setErrors(newErrors);
        return;
      }

      filesToProcess.forEach(file => {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          const preview = URL.createObjectURL(file);
          newFiles.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview,
          });
        }
      });

      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }

      setErrors(newErrors);
    },
    [files.length, maxFiles, validateFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [processFiles]
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    setErrors([]);
  }, []);

  const getInputProps = useCallback(
    () => ({
      type: 'file' as const,
      accept,
      multiple,
      onChange: handleFileSelect,
      ref: inputRef,
    }),
    [accept, multiple, handleFileSelect]
  );

  return [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ];
}