import { resourceEmojiDict, resourceIconsDict } from "./constants";

export type ResourceComponentProps = {
    resourceId: string;
    amount?: number;
}

export const ResourceComponent = ({ resourceId, amount }: ResourceComponentProps ) => {
    const src = resourceIconsDict[resourceId];
    return (
        <>
            {src ? (
                <img
                    style={{height: "5%", width: "30%", display: "inline"}}
                    src={src}
                />
            ) : (
                // No asset for this resource yet — emoji atom instead of a broken img
                <span style={{ display: "inline" }}>{resourceEmojiDict[resourceId] ?? "❓"}</span>
            )}
            { amount && <div style={{display: "inline"}}> x {amount} </div> }
        </>
    )
}
