import "../../App.css";
import "../../../public/js-dos/js-dos-min.css";
import React from "react";

export default function DosBox({ bundleUrl }: { bundleUrl: string }) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const ciRef = React.useRef<any>(null);
    const startedRef = React.useRef(false);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container || startedRef.current) return;
        startedRef.current = true;

        const w = window as any;
        if (w.emulators) w.emulators.pathPrefix = "/js-dos/";
        if (typeof w.Dos === "undefined") return;

        while (container.firstChild) container.removeChild(container.firstChild);

        w.Dos(container).run(bundleUrl).then((ci: any) => {
            ciRef.current = ci;
            console.log("DosBox started", ci);
        }).catch((err: any) => {
            console.error("DosBox error", err);
        });

        return () => {
            console.log('DosBox CLEANUP FIRED', bundleUrl)
            if (ciRef.current?.exit) {
                ciRef.current.exit();
                ciRef.current = null;
            }
            startedRef.current = false;
            while (container.firstChild) container.removeChild(container.firstChild);
        };
    }, [bundleUrl]);

    return <div ref={containerRef} className="dosbox-window" />;
}