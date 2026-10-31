import { useState } from "react";
import { serviceIcon } from "./serviceIcons";
import { serviceCardImage } from "./serviceImages";

/**
 * Үйлчилгээний картын зургийн слот. Хамгийн багадаа 72×72.
 * Зургийн src тохируулаагүй, эсвэл ачаалалт амжилтгүй бол одоогийн icon.
 */
export function ServiceThumb({ id, iconClassName = "w-8 h-8" }: { id?: string; iconClassName?: string }) {
  const spec = serviceCardImage(id);
  const [failed, setFailed] = useState(false);
  const src = spec?.src;
  const Icon = serviceIcon(id);

  return (
    <span className="relative flex h-full w-full min-h-[72px] min-w-[72px] items-center justify-center">
      {src && !failed ? (
        <img
          src={src}
          alt={spec.alt}
          width={144}
          height={144}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon className={iconClassName} aria-hidden />
      )}
    </span>
  );
}
