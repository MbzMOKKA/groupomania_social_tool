//Imports
import colors from '../../utils/style/colors';
import styled from 'styled-components';

//Exports
export const StyledPostFooter = styled.footer`
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px white solid;
    padding-top: 12px;
    padding-bottom: 6px;
`;
export const StyledPostReaction = styled.div`
    display: flex;
    button {
        margin-right: 18px;
        background-color: transparent;
    }
`;
export const StyledPostEditCounter = styled.p`
    color: ${colors.secondary};
    font-style: italic;
`;
