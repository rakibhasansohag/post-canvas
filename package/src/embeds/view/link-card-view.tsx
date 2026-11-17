// The read-only `linkCard` view. Server-safe and static.
import type { ViewProps } from '../../core/types';
import { externalRel, linkCardRender } from '../render-spec';

/** A link card: the page's image, site, title and description, all one link. */
export function LinkCardView({ node }: ViewProps) {
  const card = linkCardRender(node.attrs);
  if (!card) return null;
  return (
    <div className={card.image ? 'pc-link-card' : 'pc-link-card pc-link-card-text'}>
      <a className="pc-link-card-anchor" href={card.url} target="_blank" rel={externalRel}>
        {card.image && <img className="pc-link-card-image" src={card.image} alt="" loading="lazy" decoding="async" />}
        <span className="pc-link-card-body">
          <span className="pc-link-card-site">
            {card.favicon && (
              <img className="pc-link-card-favicon" src={card.favicon} alt="" width={16} height={16} loading="lazy" />
            )}
            {card.site}
          </span>
          <span className="pc-link-card-title">{card.title}</span>
          {card.description && <span className="pc-link-card-description">{card.description}</span>}
        </span>
      </a>
    </div>
  );
}
