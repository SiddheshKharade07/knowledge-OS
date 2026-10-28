$p = "frontend/src/pages/DocumentsPage.tsx"
$s = Get-Content -Raw $p
$old = @"
      </Modal>

      <DocumentDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
"@
$neu = @"
      </Modal>

      <ConfirmDialog
        open={ [bool]$deleteTarget }
        title="Delete document?"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium text-on-surface">{ $deleteTarget?.fileName }</span>?
            This action will remove the document and its associated searchable content.
          </>
        }
        confirmLabel="Delete document"
        destructive
        busy={ $deleteMutation.isPending }
        onCancel={ { $deleteTarget = $null } }
        onConfirm={ { if ($deleteTarget) { $deleteMutation.mutate($deleteTarget.id) } } }
      />

      <DocumentDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
"@
if ($s -notmatch [regex]::Escape($old)) { Write-Host "NOTFOUND"; exit 1 }
$s2 = $s.Replace($old, $neu)
Set-Content -NoNewline -Path $p -Value $s2
Write-Host "OK"
