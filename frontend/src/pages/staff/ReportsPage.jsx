import { useCallback, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import PageHeader from '../../components/PageHeader'
import ConfirmedTable from '../../components/reports/ConfirmedTable'
import ReportFilters from '../../components/reports/ReportFilters'
import StatusBars from '../../components/reports/StatusBars'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../hooks/useToast'
import { exportAppointmentReport, getAppointmentReport } from '../../services/reportService' //changed
import { getNow } from '../../utils/clock'
import { getManilaDateStr } from '../../utils/datetime'
import { downloadFile } from '../../utils/download'
import { PERMISSIONS } from '../../utils/permissions'
import { validateReportRange } from '../../utils/reportValidators'

const FORMAT_LABELS = { csv: 'CSV', pdf: 'PDF' }

// Report type + date range -> preview -> export. The page opens with this month so far; Generate
// runs the fields. Export always uses the range that was last GENERATED, and is disabled when the
// fields have been edited since, so a file never disagrees with what is on screen.
function ReportsPage(){
    const { can } = useSession()
    const toast = useToast()
    const canExport = can(PERMISSIONS.REPORTS_EXPORT)

    const today = getManilaDateStr(getNow())
    const [fields, setFields] = useState({ from: `${today.slice(0, 8)}01`, to: today })
    const [applied, setApplied] = useState(fields)
    const [errors, setErrors] = useState({})
    const [exporting, setExporting] = useState(null) // 'csv' | 'pdf' while a file is being made
    const [exportFailure, setExportFailure] = useState(null) // the format that failed, for "Try again"

    const load = useCallback(() => getAppointmentReport({ from: applied.from, to: applied.to }), [applied.from, applied.to])
    const { status, data, reload } = useAsyncData(load)

    const fieldsMatch = fields.from === applied.from && fields.to === applied.to
    const loading = status === 'loading'

    function changeField(name, value) {
        setFields((current) => ({ ...current, [name]: value }))
        setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)))
    }

    function handleGenerate() {
        const fieldErrors = validateReportRange(fields)
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            document.getElementById(fieldErrors.from ? 'report-from' : 'report-to')?.focus()
            return
        }
        setExportFailure(null)
        if (fieldsMatch) reload()
        else setApplied(fields)
    }

    async function handleExport(format) {
        setExporting(format)
        setExportFailure(null)
        try {
            downloadFile(await exportAppointmentReport({ from: applied.from, to: applied.to, format }))
            toast.show({ tone: 'success', title: `${FORMAT_LABELS[format]} exported.`, message: 'The export is recorded in the audit log.' })
        } catch (error) {
            if (error.status === 403) {
                toast.show({ tone: 'warning', title: 'Not allowed.', message: "You don't have permission to export reports." })
            } else {
                setExportFailure(format) // shows the message with "Try again"
            }
        } finally {
            setExporting(null)
        }
    }

    const exportDisabled = !canExport || !fieldsMatch || status !== 'success' || exporting !== null

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Reports"
                subtitle="Schedule and appointment summaries"
                action={
                <div className="flex flex-col gap-1 sm:items-end">
                    <div className="flex gap-3">
                        <Button variant="secondary" disabled={exportDisabled} onClick={() => handleExport('csv')}>
                            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
                        </Button>
                        <Button disabled={exportDisabled} onClick={() => handleExport('pdf')}>
                            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
                        </Button>
                    </div>
                    {!canExport && (
                    <p className="text-sm text-muted">Requires export permission. The server checks this on every action.</p>
                    )}
                    {canExport && !fieldsMatch && (
                    <p className="text-sm text-muted">Press Generate to update the report before exporting.</p>
                    )}
                </div>
                }
            />
        
            {exportFailure && (
                <Alert tone="error" title="The export failed.">
                Nothing was exported, and nothing was recorded.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => handleExport(exportFailure)}>
                        Try again
                    </button>
                </Alert>
            )}
        
            <ReportFilters fields={fields} errors={errors} onChange={changeField} onGenerate={handleGenerate} generating={loading} />
        
            {loading && <Spinner label="Generating the report…" />}
            {status === 'error' && <ErrorState message="We couldn't generate the report." onRetry={reload} />}
            {status === 'success' && (
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <StatusBars counts={data.statusCounts} total={data.total} />
                    <ConfirmedTable key={`${data.from}-${data.to}`} appointments={data.confirmedAppointments} />
                </div>
            )}
        
            <p className="text-sm text-muted">Reports show only the personal details needed. Exports are recorded in the audit log.</p>
        </div>
    )
}
export default ReportsPage