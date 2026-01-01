
import { District } from "../../../../shared/types";

export const useBoardComponent = () => {
    
    const Hud = (props: {
        onArrowUp?: () => void,
        onSelectCard?: (card: number) => void,
        onArrowDown?: () => void,
        onPass?: () => void,
        onReveal?: () => void,
        selectedCardIndex: number | undefined,
        children?: React.ReactNode
    }) => {
    return <>
        <EventBox h={220} w={150} y={805} x={118} show={true} key="arrow-up" onClick={props.onArrowUp} />

        {/* hand */}
        {props.children}
        
        <EventBox h={220} w={150} y={790} x={1640} show={true} key="arrow-down" onClick={props.onArrowDown}  />

        {/* <Button style y={455} x={970} show={true} key="btn-pass" onClick={props.onPass} /> */}

        
        {/* <Button  w={160} h={75} y={680} x={1630} show={true} key="btn-reveal" onClick={props.onReveal} /> */}
        </>;
    };

    const Clickers = (props: {
    x?: number, y?: number,
    mirror?: boolean,
    district?: District,
    onLocationSelect: (districtIndex: number, locationIndex: number) => void;
    }) => {
    const bottomRowOffsetX = props.mirror ? 108 : 0;
    const offsetY = 0;
    const offsetX = 0;
    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y ?? 0, left: props.x ?? 0, width: "fit-content", height: "fit-content"}}>
        <ClickBox _onClick={() => props.onLocationSelect(0, 0)} x={54 + offsetX} y={0 + offsetY} show={true} />
        <ClickBox _onClick={() => props.onLocationSelect(0, 1)} x={178 + offsetX} y={0 + offsetY} show={true} />
        <ClickBox _onClick={() => props.onLocationSelect(0, 2)} x={0 + bottomRowOffsetX} y={67 + offsetY} show={true} />
        <ClickBox _onClick={() => props.onLocationSelect(0, 3)} x={124 + bottomRowOffsetX} y={67 + offsetY} show={true} />
    </div>;
    }

    const DebugBox = (props: {log?: string}) => {
    return <div className="w-[calc(100%-1300px)] border-1 border-solid">
        <h2>Debug</h2>
        <code>{props.log ?? ""}</code>
    </div>;
    }

    const ClickBox = (props: {
        // w?: number,
        // h?: number,
        x: number,
        y: number,
        show?: boolean,
        _onClick: () => void;
        children?: React.ReactNode,
        disabled?: boolean,
    }) => {
    return ( 
        <EventBox 
            key={props.x + "-" + props.y}
            onClick={props._onClick} 
            // w={props.w ?? 110} h={props.h ?? 55} 
            // isSelected={props.isSelected}
            disabled={props.disabled}
            x={props.x} y={props.y}
            show={props.show}
        >
            
            {props.children}
        
        </EventBox>
    );
    }

    const NumericTrackers = (props: {
    x: number,
    y: number,
    }) => {
    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y, left: props.x}}>
        <NumericTracker x={0} y={0} show={true} />
        <NumericTracker x={4} y={50} h={38} w={38} show={true} />
        <NumericTracker x={4} y={49 + 1 * 38} h={38} w={38} show={true} />
        <NumericTracker x={4} y={49 + 2 * 38} h={38} w={38} show={true} />
    </div>;
    };

    const NumericTracker = (props: {
    w?: number,
    h?: number,
    x: number,
    y: number,
    show?: boolean,
    children?: React.ReactNode,
    }) => {
    return (
        <EventBox {...props} w={props.w ?? 45} h={props.h ?? 45}>
            {props.children}
        </EventBox>
    );
    }

    const VisualTracker = (props: {
    w?: number,
    h?: number,
    x: number,
    y: number,
    show?: boolean,
    }) => {
    return <EventBox {...props} w={props.w ?? 175} h={props.h ?? 55} />;
    }

    const DynamicElement = (props: {
    w?: number,
    h?: number,
    x: number,
    y: number,
    show?: boolean,
    }) => {
    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y, left: props.x}}>
        <EventBox {...props} w={props.w ?? 20} h={props.h ?? 50} x={0} y={0} />
        <EventBox {...props} w={props.w ?? 20} h={props.h ?? 50} x={(props.w ?? 20) - 1} y={0} />
    </div>;
    }

    const Button = (props: {
    w?: number,
    h?: number,
    x: number,
    y: number,
    show?: boolean,
    onClick?: () => void,
    }) => {
    return <EventBox {...props} w={props.w ?? 105} h={props.h ?? 48} />
    }

    const EventBox = (props: {
        w?: number,
        h?: number,
        x: number,
        y: number,
        show?: boolean,
        isSelected?: boolean,
        onClick?: () => void,
        children?: React.ReactNode,
        disabled?: boolean,
        }) => {
        return (
            <div key={props.x + "-" + props.y} className={"event-box absolute" + (props.show ? " border-2 border-solid" : "") + (props.disabled ? " disabled" : "")}
                style={{top: props.y, left: props.x, backgroundColor: props.isSelected  || props.disabled ? "RGB(75,0,130, 0.3)" : "none", width: props.w ?? "fit-content", height: props.h ?? "fit-content"}}
                onClick={props.disabled ? () => {} : props.onClick}
            >
                {props.children}
            </div>
        );
    }

    return {
        Hud,
        Clickers,
        DebugBox,
        ClickBox,
        NumericTrackers,
        NumericTracker,
        VisualTracker,
        DynamicElement,
        Button,
        EventBox
    }
}