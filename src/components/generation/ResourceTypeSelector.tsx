import type { ResourceType } from "../../types";
import { resourceTypeLabels } from "../../constants/generationLabels";

export function ResourceTypeSelector({
  value,
  onChange,
}: {
  value: ResourceType;
  onChange: (value: ResourceType) => void;
}) {
  return (
    <label>
      <span className="field-label">Tipo de recurso</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value as ResourceType)}>
        {(Object.keys(resourceTypeLabels) as ResourceType[]).map((type) => (
          <option key={type} value={type}>
            {resourceTypeLabels[type]}
          </option>
        ))}
      </select>
    </label>
  );
}
