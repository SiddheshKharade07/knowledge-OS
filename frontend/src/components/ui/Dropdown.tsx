import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface DropdownBaseProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  className?: string;
  menuClassName?: string;
  id?: string;
}

interface SingleSelectProps extends DropdownBaseProps {
  mode?: 'single';
  options: SelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  searchable?: boolean;
  clearable?: boolean;
  searchPlaceholder?: string;
}

interface MultiSelectProps extends DropdownBaseProps {
  mode: 'multi';
  options: SelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  searchable?: boolean;
  clearable?: boolean;
  searchPlaceholder?: string;
  maxChips?: number;
  showCount?: boolean;
}

type DropdownProps = SingleSelectProps | MultiSelectProps;

function getDisplayValue(options: SelectOption[], value: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const match = options.find((opt) => String(opt.value) === String(value));
  return match ? match.label : String(value);
}

export function Dropdown(props: DropdownProps) {
  const {
    label,
    placeholder = 'Select...',
    disabled = false,
    error = null,
    loading = false,
    loadingText = 'Loading...',
    emptyText = 'No options available.',
    className,
    menuClassName,
    id,
  } = props;

  const isMulti = props.mode === 'multi';
  const options = props.options;
  const searchable = props.searchable ?? options.length > 6;
  const clearable = props.clearable ?? false;
  const searchPlaceholder = props.searchPlaceholder ?? 'Search...';

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0, flip: false });

  const selectedValues = React.useMemo(() => {
    if (isMulti) {
      return (props as MultiSelectProps).value ?? [];
    }
    const v = (props as SingleSelectProps).value;
    return v === null || v === undefined || v === '' ? [] : [v];
  }, [isMulti, props]);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedSet = React.useMemo(
    () => new Set(selectedValues.map((v) => String(v))),
    [selectedValues],
  );

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuRef.current?.offsetHeight || 320;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < menuHeight && spaceAbove > menuHeight + gap * 2;
    setPos({
      top: flip ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      flip,
    });
  }, []);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    updatePosition();
    // Update again after menu renders to account for actual height
    const t = window.setTimeout(updatePosition, 0);
    if (searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, searchable, updatePosition]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleOption = (opt: SelectOption) => {
    if (opt.disabled || disabled) return;
    if (isMulti) {
      const current = (props as MultiSelectProps).value ?? [];
      const exists = current.some((v) => String(v) === String(opt.value));
      if (exists) {
        (props as MultiSelectProps).onChange(current.filter((v) => String(v) !== String(opt.value)));
      } else {
        (props as MultiSelectProps).onChange([...current, opt.value]);
      }
      return;
    }
    (props as SingleSelectProps).onChange(opt.value);
    setOpen(false);
  };

  const clearAll = () => {
    if (disabled) return;
    if (isMulti) {
      (props as MultiSelectProps).onChange([]);
      return;
    }
    (props as SingleSelectProps).onChange(null);
  };

  const removeChip = (val: string | number) => {
    if (disabled) return;
    if (!isMulti) return;
    const current = (props as MultiSelectProps).value ?? [];
    (props as MultiSelectProps).onChange(current.filter((v) => String(v) !== String(val)));
  };

  const chips = React.useMemo(() => {
    if (!isMulti) return [] as { value: string | number; label: string }[];
    const current = (props as MultiSelectProps).value ?? [];
    return current
      .map((val) => {
        const match = options.find((opt) => String(opt.value) === String(val));
        return { value: val, label: match ? match.label : String(val) };
      })
      .filter(Boolean);
  }, [isMulti, options, props]);

  const singleLabel = !isMulti ? getDisplayValue(options, (props as SingleSelectProps).value) : null;
  const hasSelection = isMulti ? chips.length > 0 : selectedValues.length > 0;
  const showClear = clearable && hasSelection && !disabled;

  return (
    <div ref={wrapperRef} className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-on-surface">
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((o) => !o);
        }}
        className={cn(
          'flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-sm shadow-card transition-colors',
          error
            ? 'border-error focus:ring-error/20'
            : 'border-outline-variant/70 focus:border-primary/60 focus:ring-primary/20',
          disabled || loading ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface-container-low',
          'bg-surface-container-lowest focus:outline-none focus:ring-2',
          isMulti && chips.length > 0 ? 'py-1.5' : 'py-2',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {isMulti ? (
            chips.length > 0 ? (
              chips.slice(0, props.maxChips ?? 4).map((chip) => (
                <span
                  key={String(chip.value)}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface"
                >
                  <span className="max-w-[140px] truncate">{chip.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(chip.value);
                    }}
                    className="rounded-full p-0.5 hover:bg-surface-container-high"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-on-surface-variant">{placeholder}</span>
            )
          ) : singleLabel ? (
            <span className="truncate text-on-surface">{singleLabel}</span>
          ) : (
            <span className="text-on-surface-variant">{placeholder}</span>
          )}
          {isMulti && chips.length > (props.maxChips ?? 4) ? (
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
              +{chips.length - (props.maxChips ?? 4)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {showClear ? (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="rounded-full p-1 hover:bg-surface-container"
            >
              <X className="h-3.5 w-3.5 text-on-surface-variant" />
            </button>
          ) : null}
          {loading ? <Spinner className="h-3.5 w-3.5" /> : <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', open && 'rotate-180')} />}
        </div>
      </button>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
      {open && !disabled ? createPortal(
        <div
          ref={(el) => {
            (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (el) {
              // Update position after mount to use actual height
              requestAnimationFrame(() => updatePosition());
            }
          }}
          role="listbox"
          aria-multiselectable={isMulti}
          className={cn(
            'fixed z-[10000] max-h-64 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest shadow-pop',
            menuClassName,
          )}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {searchable ? (
            <div className="border-b border-outline-variant/40 p-2">
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : null}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant">
                <Spinner className="h-3.5 w-3.5" />
                {loadingText}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-on-surface-variant">
                {search.trim() ? 'No options match your search.' : emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(String(opt.value));
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => toggleOption(opt)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                      opt.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-container',
                      isSelected ? 'bg-primary/5 text-on-surface' : 'text-on-surface',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isMulti ? (
                      <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4" />
                    ) : isSelected ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          {isMulti && showClear ? (
            <div className="flex items-center justify-between border-t border-outline-variant/40 px-3 py-1.5">
              <span className="text-xs text-on-surface-variant">{chips.length} selected</span>
              <button type="button" onClick={clearAll} className="text-xs font-medium text-primary hover:underline">
                Clear all
              </button>
            </div>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export default Dropdown;
