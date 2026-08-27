export function KeyTakeaways({items}: {readonly items: readonly string[]}) {
  return (
    <section
      data-resource-section="key-takeaways"
      aria-labelledby="resource-key-takeaways-heading"
    >
      <h2 id="resource-key-takeaways-heading">Key Takeaways</h2>
      <ul>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
