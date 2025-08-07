import { cn } from "@/lib/utils";

export const HcaLogo = ({ className, ...props }: { className?: string, width?: number, height?: number }) => {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      className={cn("h-8 w-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g>
        <circle cx="50" cy="50" r="48" fill="#F8F8F8" />
        <circle cx="50" cy="50" r="46" stroke="#C8A866" strokeWidth="3" fill="white"/>
        <path
          d="M26.5 28V72H36.5V53H63.5V72H73.5V28H63.5V46H36.5V28H26.5Z"
          fill="#166534"
        />
        <path
          d="M84 59C84 70.0457 75.0457 79 64 79C52.9543 79 44 70.0457 44 59C44 54.5558 45.4193 50.4855 47.8098 47.2227"
          stroke="#F5B01A"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <g fill="#F5B01A">
          <circle cx="64" cy="46" r="6" />
          <path d="M64 36V39" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M72.0711 37.9289L69.9497 40.0503" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M75 46H72" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M72.0711 54.0711L69.9497 51.9497" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M64 56V53" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M55.9289 54.0711L58.0503 51.9497" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M53 46H56" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
          <path d="M55.9289 37.9289L58.0503 40.0503" stroke="#F5B01A" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </g>
    </svg>
  );
};

export const HcaLogoIcon192 = () => <HcaLogo width={192} height={192} className="w-48 h-48"/>
export const HcaLogoIcon512 = () => <HcaLogo width={512} height={512} className="w-[512px] h-[512px]"/>
