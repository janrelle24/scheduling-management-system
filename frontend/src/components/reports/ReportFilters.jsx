import Button from '../ui/Button'
import Card from '../ui/Card'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'
import { REPORT_NAME } from '../../utils/reportFiles'

// Report type, From, To and Generate. Only "Status summary" exists (it shows both cards).
//   fields: { from, to }    errors: { from?, to? }    onChange(field, value)    onGenerate()
function ReportFilters({ fields, errors, onChange, onGenerate, generating }){
    return (
        <Card>
            <form
                noValidate
                onSubmit={(event) => {
                event.preventDefault()
                onGenerate()
                }}
                className="flex flex-col gap-4"
            >
                <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
                <SelectField id="report-type" label="Report type" value="status-summary" onChange={() => {}}>
                    <option value="status-summary">{REPORT_NAME}</option>
                </SelectField>
                <TextField
                    id="report-from"
                    label="From"
                    type="date"
                    value={fields.from}
                    onChange={(event) => onChange('from', event.target.value)}
                    error={errors.from}
                />
                <TextField
                    id="report-to"
                    label="To"
                    type="date"
                    value={fields.to}
                    onChange={(event) => onChange('to', event.target.value)}
                    error={errors.to}
                />
                <Button type="submit" disabled={generating} className="sm:self-start lg:mt-8">
                    {generating ? 'Generating…' : 'Generate'}
                </Button>
                </div>
                <p className="text-sm text-muted">
                Requests are counted by the date they were submitted; confirmed appointments are listed by their start date.
                </p>
            </form>
        </Card>
    )
}
export default ReportFilters