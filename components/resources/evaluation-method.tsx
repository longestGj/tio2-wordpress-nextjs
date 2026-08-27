export function EvaluationMethod({items}: {readonly items: readonly string[]}) {
  return (
    <section
      data-resource-section="evaluation-method"
      aria-labelledby="resource-evaluation-method-heading"
    >
      <h2 id="resource-evaluation-method-heading">Evaluation Method</h2>
      <ol>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ol>
    </section>
  )
}
