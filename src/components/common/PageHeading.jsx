import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Design page heading: eyebrow, title, description and actions on the right. */
export default function PageHeading({ title, description, actions, back, eyebrow = 'ACTIVEHUB WORKSPACE' }) {
  return (
    <div className="page-heading">
      <div>
        {back && <Link className="link" to={back.to} style={{ marginBottom: 10 }}><Icon name="left" size={14} />{back.label}</Link>}
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
